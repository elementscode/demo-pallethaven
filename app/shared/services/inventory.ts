import { LiveTable, sql, tx, ForbiddenError, ValidationError } from "@elements/app";
import { requireManager, requireUser } from "#app/shared/services/auth";

export interface Product {
  id: string;
  sku: string;
  name: string;
  supplierId: string;
  supplierName: string;
  costCents: number;
  onHand: number;
  reorderPoint: number;
  updatedAt: Date;
}

export type MovementReason = "count" | "damage" | "sale" | "receipt";

export interface StockMovement {
  id: string;
  productId: string;
  delta: number;
  quantityAfter: number;
  reason: MovementReason;
  note: string;
  userName: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: number | null;
  createdAt: Date;
}

export interface Adjustment {
  productId: string;
  reason: "count" | "damage" | "sale";
  quantity: number;
  note: string;
}

export interface NewProduct {
  sku: string;
  name: string;
  supplierId: string;
  cost: string;
  onHand: number;
  reorderPoint: number;
}

export interface ProductDetails {
  productId: string;
  name: string;
  supplierId: string;
  cost: string;
  reorderPoint: number;
}

export function isLow(p: { onHand: number; reorderPoint: number }): boolean {
  return p.onHand <= p.reorderPoint;
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "12.50" or "$12.50" to cents, or null when it is not a price. */
export function parseMoney(text: string): number | null {
  let cleaned = text.trim().replace(/^\$/, "").replace(/,/g, "");

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  return Math.round(parseFloat(cleaned) * 100);
}

const readOnly = {
  insert: (): never => { throw new ForbiddenError(); },
  update: (): never => { throw new ForbiddenError(); },
  delete: (): never => { throw new ForbiddenError(); },
};

/**
 * Every product with its supplier's name. Writes go through the rpc below and
 * reach open pages through the notify trigger in the schema migration, so the
 * view itself is read-only.
 */
export let products = new LiveTable<Product>({
  channel: (partition) => (partition ? `products:${partition}` : "products"),
  select: (p) => sql<Product>(`
    select p.id, p.sku, p.name, p.supplierId, s.name as supplierName,
           p.costCents, p.onHand, p.reorderPoint, p.updatedAt
    from products p
    join suppliers s on s.id = p.supplierId
    where ${p.id ?? null}::uuid is null or p.id = ${p.id ?? null}::uuid
  `),
  ...readOnly,
});

/** One product's history, newest first, a page at a time. */
export let stockMovements = new LiveTable<StockMovement>({
  channel: (partition) => (partition ? `stockMovements:${partition}` : "stockMovements"),
  select: (p, w) => sql<StockMovement>(`
    select m.id, m.productId, m.delta, m.quantityAfter, m.reason, m.note,
           m.userName, m.purchaseOrderId, po.number as purchaseOrderNumber,
           m.createdAt
    from stockMovements m
    left join purchaseOrders po on po.id = m.purchaseOrderId
    where m.productId = ${p.productId} and ${w.keyset("m")}
    order by ${w.order("m")} ${w.page()}
  `),
  ...readOnly,
});

/**
 * Moves a product's on-hand quantity and records why. A count sets the
 * quantity to what was counted; damage and a sale take units away.
 *
 * @rpc
 */
export function adjustStock(input: Adjustment) {
  let user = requireUser();
  let quantity = Math.trunc(Number(input.quantity));

  if (!["count", "damage", "sale"].includes(input.reason)) {
    throw new ValidationError("Choose a reason.");
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new ValidationError("Enter a quantity of zero or more.");
  }

  if (input.reason !== "count" && quantity === 0) {
    throw new ValidationError("Enter how many units to remove.");
  }

  tx(() => {
    let product = sql<{ onHand: number }>(
      `select onHand from products where id = ${input.productId} for update`,
    ).firstOrThrow("That product no longer exists.");

    let delta = input.reason === "count" ? quantity - product.onHand : -quantity;

    if (product.onHand + delta < 0) {
      throw new ValidationError(`Only ${product.onHand} on hand.`);
    }

    recordMovement(input.productId, delta, input.reason, input.note.trim(), user.name, null);
  });
}

/**
 * Applies a delta to one product and writes the movement that explains it.
 * Callers hold the product's row lock.
 */
export function recordMovement(
  productId: string,
  delta: number,
  reason: MovementReason,
  note: string,
  userName: string,
  purchaseOrderId: string | null,
) {
  let updated = sql<{ onHand: number }>(`
    update products set onHand = onHand + ${delta}
    where id = ${productId}
    returning onHand
  `).firstOrThrow("That product no longer exists.");

  sql(`
    insert into stockMovements (productId, delta, quantityAfter, reason, note, userName, purchaseOrderId)
    values (${productId}, ${delta}, ${updated.onHand}, ${reason}, ${note}, ${userName}, ${purchaseOrderId})
  `);
}

/** @rpc */
export function createProduct(input: NewProduct): string {
  let user = requireManager();
  let sku = input.sku.trim().toUpperCase();
  let name = input.name.trim();
  let cost = parseMoney(input.cost);
  let onHand = Math.trunc(Number(input.onHand));
  let reorderPoint = Math.trunc(Number(input.reorderPoint));

  if (!sku || !name) {
    throw new ValidationError("A product needs a SKU and a name.");
  }

  if (!input.supplierId) {
    throw new ValidationError("Choose a supplier.");
  }

  if (cost === null) {
    throw new ValidationError("Enter the cost as a price, like 12.50.");
  }

  if (!(onHand >= 0) || !(reorderPoint >= 0)) {
    throw new ValidationError("Quantities can't be negative.");
  }

  if (!sql(`select 1 from products where sku = ${sku}`).empty()) {
    throw new ValidationError(`${sku} is already in use.`);
  }

  return tx(() => {
    let product = sql<{ id: string }>(`
      insert into products (sku, name, supplierId, costCents, onHand, reorderPoint)
      values (${sku}, ${name}, ${input.supplierId}, ${cost}, 0, ${reorderPoint})
      returning id
    `).firstOrThrow();

    recordMovement(product.id, onHand, "count", "opening stock count", user.name, null);

    return product.id;
  });
}

/** @rpc */
export function updateProduct(input: ProductDetails) {
  requireManager();
  let name = input.name.trim();
  let cost = parseMoney(input.cost);
  let reorderPoint = Math.trunc(Number(input.reorderPoint));

  if (!name) {
    throw new ValidationError("A product needs a name.");
  }

  if (cost === null) {
    throw new ValidationError("Enter the cost as a price, like 12.50.");
  }

  if (!(reorderPoint >= 0)) {
    throw new ValidationError("The reorder point can't be negative.");
  }

  sql(`
    update products
    set name = ${name}, supplierId = ${input.supplierId}, costCents = ${cost}, reorderPoint = ${reorderPoint}
    where id = ${input.productId}
  `);
}

export interface LowStockRow {
  sku: string;
  name: string;
  supplierName: string;
  onHand: number;
  reorderPoint: number;
}

export function lowStockProducts(): LowStockRow[] {
  return sql<LowStockRow>(`
    select p.sku, p.name, s.name as supplierName, p.onHand, p.reorderPoint
    from products p
    join suppliers s on s.id = p.supplierId
    where p.onHand <= p.reorderPoint
    order by s.name, p.sku
  `).all();
}
