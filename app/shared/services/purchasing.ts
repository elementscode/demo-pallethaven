import { LiveTable, sql, tx, ForbiddenError, ValidationError } from "@elements/app";
import { requireManager, requireUser } from "#app/shared/services/auth";
import { recordMovement } from "#app/shared/services/inventory";
import { SendPurchaseOrderJob } from "#app/jobs/send-purchase-order";

export type PoStatus = "draft" | "sent" | "partially_received" | "received";

export interface PurchaseOrder {
  id: string;
  number: number;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  status: PoStatus;
  createdByName: string;
  createdAt: Date;
  sentAt: Date | null;
  receivedAt: Date | null;
  lineCount: number;
  unitsOrdered: number;
  unitsReceived: number;
  totalCents: number;
}

export interface PoLine {
  id: string;
  purchaseOrderId: string;
  productId: string;
  sku: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostCents: number;
  createdAt: Date;
}

export const STATUS_LABELS: Record<PoStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_received: "Partially received",
  received: "Received",
};

export function statusIntent(status: PoStatus): string {
  switch (status) {
    case "draft":
      return "";

    case "sent":
      return "is-info";

    case "partially_received":
      return "is-warning";

    case "received":
      return "is-success";
  }
}

export function poNumber(n: number): string {
  return `PO-${n}`;
}

/** What to order to bring a product back to twice its reorder point. */
export function suggestedQuantity(p: { onHand: number; reorderPoint: number }): number {
  return Math.max(p.reorderPoint * 2 - p.onHand, 1);
}

const readOnly = {
  insert: (): never => { throw new ForbiddenError(); },
  update: (): never => { throw new ForbiddenError(); },
  delete: (): never => { throw new ForbiddenError(); },
};

/** Orders with their supplier and line totals, kept live by the schema's triggers. */
export let purchaseOrders = new LiveTable<PurchaseOrder>({
  channel: (partition) => (partition ? `purchaseOrders:${partition}` : "purchaseOrders"),
  select: (p) => sql<PurchaseOrder>(`
    select po.id, po.number, po.supplierId, s.name as supplierName, s.email as supplierEmail,
           po.status, po.createdByName, po.createdAt, po.sentAt, po.receivedAt,
           coalesce(l.lineCount, 0) as lineCount,
           coalesce(l.unitsOrdered, 0) as unitsOrdered,
           coalesce(l.unitsReceived, 0) as unitsReceived,
           coalesce(l.totalCents, 0) as totalCents
    from purchaseOrders po
    join suppliers s on s.id = po.supplierId
    left join lateral (
      select count(*)::int as lineCount,
             sum(quantityOrdered)::int as unitsOrdered,
             sum(quantityReceived)::int as unitsReceived,
             sum(quantityOrdered * unitCostCents)::int as totalCents
      from poLines
      where purchaseOrderId = po.id
    ) l on true
    where ${p.id ?? null}::uuid is null or po.id = ${p.id ?? null}::uuid
  `),
  ...readOnly,
});

/** One order's lines. */
export let poLines = new LiveTable<PoLine>({
  channel: (partition) => (partition ? `poLines:${partition}` : "poLines"),
  select: (p) => sql<PoLine>(`
    select l.id, l.purchaseOrderId, l.productId, p.sku, p.name,
           l.quantityOrdered, l.quantityReceived, l.unitCostCents, l.createdAt
    from poLines l
    join products p on p.id = l.productId
    where l.purchaseOrderId = ${p.purchaseOrderId}
  `),
  ...readOnly,
});

function lockOrder(purchaseOrderId: string): { status: PoStatus; supplierId: string } {
  return sql<{ status: PoStatus; supplierId: string }>(
    `select status, supplierId from purchaseOrders where id = ${purchaseOrderId} for update`,
  ).firstOrThrow("That purchase order no longer exists.");
}

function lockDraft(purchaseOrderId: string): { supplierId: string } {
  let order = lockOrder(purchaseOrderId);

  if (order.status !== "draft") {
    throw new ValidationError("This order has been sent and can no longer be edited.");
  }

  return order;
}

function wholeQuantity(value: number, message: string): number {
  let quantity = Math.trunc(Number(value));

  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new ValidationError(message);
  }

  return quantity;
}

/**
 * Starts a draft for one supplier, filled with every product of theirs at or
 * under its reorder point.
 *
 * @rpc
 */
export function createPurchaseOrder(supplierId: string): string {
  let user = requireManager();

  if (sql(`select 1 from suppliers where id = ${supplierId}`).empty()) {
    throw new ValidationError("Choose a supplier.");
  }

  return tx(() => {
    let order = sql<{ id: string }>(`
      insert into purchaseOrders (supplierId, createdByName)
      values (${supplierId}, ${user.name})
      returning id
    `).firstOrThrow();

    sql(`
      insert into poLines (purchaseOrderId, productId, quantityOrdered, unitCostCents)
      select ${order.id}, id, greatest(reorderPoint * 2 - onHand, 1), costCents
      from products
      where supplierId = ${supplierId} and onHand <= reorderPoint
      order by sku
    `);

    return order.id;
  });
}

/** @rpc */
export function addLine(purchaseOrderId: string, productId: string, quantity: number) {
  requireManager();
  let units = wholeQuantity(quantity, "Order at least one unit.");

  tx(() => {
    let order = lockDraft(purchaseOrderId);

    let product = sql<{ supplierId: string; costCents: number }>(
      `select supplierId, costCents from products where id = ${productId}`,
    ).firstOrThrow("That product no longer exists.");

    if (product.supplierId !== order.supplierId) {
      throw new ValidationError("That product comes from a different supplier.");
    }

    sql(`
      insert into poLines (purchaseOrderId, productId, quantityOrdered, unitCostCents)
      values (${purchaseOrderId}, ${productId}, ${units}, ${product.costCents})
      on conflict (purchaseOrderId, productId)
      do update set quantityOrdered = poLines.quantityOrdered + excluded.quantityOrdered
    `);
  });
}

/** @rpc */
export function setLineQuantity(lineId: string, quantity: number) {
  requireManager();
  let units = wholeQuantity(quantity, "Order at least one unit, or remove the line.");

  tx(() => {
    let line = sql<{ purchaseOrderId: string }>(
      `select purchaseOrderId from poLines where id = ${lineId}`,
    ).firstOrThrow("That line no longer exists.");

    lockDraft(line.purchaseOrderId);
    sql(`update poLines set quantityOrdered = ${units} where id = ${lineId}`);
  });
}

/** @rpc */
export function removeLine(lineId: string) {
  requireManager();

  tx(() => {
    let line = sql<{ purchaseOrderId: string }>(
      `select purchaseOrderId from poLines where id = ${lineId}`,
    ).firstOrThrow("That line no longer exists.");

    lockDraft(line.purchaseOrderId);
    sql(`delete from poLines where id = ${lineId}`);
  });
}

/** @rpc */
export function deletePurchaseOrder(purchaseOrderId: string) {
  requireManager();

  tx(() => {
    lockDraft(purchaseOrderId);
    sql(`delete from purchaseOrders where id = ${purchaseOrderId}`);
  });
}

/**
 * Marks a draft sent and queues the email to the supplier. The job is part of
 * the transaction, so the email only goes if the status change commits.
 *
 * @rpc
 */
export function sendPurchaseOrder(purchaseOrderId: string) {
  requireManager();

  tx(() => {
    lockDraft(purchaseOrderId);

    if (sql(`select 1 from poLines where purchaseOrderId = ${purchaseOrderId}`).empty()) {
      throw new ValidationError("Add at least one line before sending.");
    }

    sql(`update purchaseOrders set status = 'sent', sentAt = now() where id = ${purchaseOrderId}`);
    new SendPurchaseOrderJob({ purchaseOrderId }).schedule();
  });
}

/**
 * Receives units against one line: adds them to on-hand, records the receipt
 * in the product's history, and moves the order to partially received or
 * received.
 *
 * @rpc
 */
export function receiveLine(lineId: string, quantity: number) {
  let user = requireUser();
  let units = wholeQuantity(quantity, "Receive at least one unit.");

  tx(() => {
    let line = sql<{ purchaseOrderId: string }>(
      `select purchaseOrderId from poLines where id = ${lineId}`,
    ).firstOrThrow("That line no longer exists.");

    let order = lockOrder(line.purchaseOrderId);

    if (order.status === "draft") {
      throw new ValidationError("Send this order before receiving it.");
    }

    if (order.status === "received") {
      throw new ValidationError("This order has already been received in full.");
    }

    let current = sql<{ productId: string; quantityOrdered: number; quantityReceived: number }>(
      `select productId, quantityOrdered, quantityReceived from poLines where id = ${lineId} for update`,
    ).firstOrThrow();

    let remaining = current.quantityOrdered - current.quantityReceived;

    if (units > remaining) {
      throw new ValidationError(
        remaining === 0 ? "This line is already received in full." : `Only ${remaining} left to receive on this line.`,
      );
    }

    sql(`update poLines set quantityReceived = quantityReceived + ${units} where id = ${lineId}`);

    sql(`select 1 from products where id = ${current.productId} for update`);
    recordMovement(current.productId, units, "receipt", "", user.name, line.purchaseOrderId);

    let open = !sql(`
      select 1 from poLines
      where purchaseOrderId = ${line.purchaseOrderId} and quantityReceived < quantityOrdered
    `).empty();

    if (open) {
      sql(`update purchaseOrders set status = 'partially_received' where id = ${line.purchaseOrderId} and status <> 'partially_received'`);
    } else {
      sql(`update purchaseOrders set status = 'received', receivedAt = now() where id = ${line.purchaseOrderId}`);
    }
  });
}

/** @rpc */
export function receiveAll(purchaseOrderId: string) {
  requireUser();

  let open = sql<{ id: string; remaining: number }>(`
    select id, quantityOrdered - quantityReceived as remaining
    from poLines
    where purchaseOrderId = ${purchaseOrderId} and quantityReceived < quantityOrdered
    order by createdAt
  `).all();

  tx(() => {
    for (let line of open) {
      receiveLine(line.id, line.remaining);
    }
  });
}

export interface PurchaseOrderSummary {
  number: number;
  supplierName: string;
  supplierContact: string;
  supplierEmail: string;
  createdByName: string;
  sentAt: Date | null;
  totalCents: number;
  lines: { sku: string; name: string; quantityOrdered: number; unitCostCents: number }[];
}

/** An order as the supplier's email shows it. */
export function purchaseOrderSummary(purchaseOrderId: string): PurchaseOrderSummary {
  let order = sql<Omit<PurchaseOrderSummary, "lines" | "totalCents">>(`
    select po.number, s.name as supplierName, s.contactName as supplierContact,
           s.email as supplierEmail, po.createdByName, po.sentAt
    from purchaseOrders po
    join suppliers s on s.id = po.supplierId
    where po.id = ${purchaseOrderId}
  `).firstOrThrow("That purchase order no longer exists.");

  let lines = sql<PurchaseOrderSummary["lines"][number]>(`
    select p.sku, p.name, l.quantityOrdered, l.unitCostCents
    from poLines l
    join products p on p.id = l.productId
    where l.purchaseOrderId = ${purchaseOrderId}
    order by p.sku
  `).all();

  let totalCents = lines.reduce((sum, l) => sum + l.quantityOrdered * l.unitCostCents, 0);

  return { ...order, totalCents, lines };
}
