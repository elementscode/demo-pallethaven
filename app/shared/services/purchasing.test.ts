import { test, equal, session, sql } from "@elements/app";
import {
  addLine,
  createPurchaseOrder,
  poLines,
  purchaseOrders,
  purchaseOrderSummary,
  receiveAll,
  receiveLine,
  sendPurchaseOrder,
  setLineQuantity,
  suggestedQuantity,
} from "#app/shared/services/purchasing";
import { expectError, loginAs, makeProduct, makeSupplier, onHand } from "#app/shared/lib/fixtures";

interface LineRow {
  id: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
}

function linesOf(purchaseOrderId: string): LineRow[] {
  return sql<LineRow>(`
    select l.id, l.productId, l.quantityOrdered, l.quantityReceived
    from poLines l join products p on p.id = l.productId
    where l.purchaseOrderId = ${purchaseOrderId}
    order by p.sku
  `).all();
}

function statusOf(purchaseOrderId: string): string {
  return sql<{ status: string }>(`select status from purchaseOrders where id = ${purchaseOrderId}`).firstOrThrow().status;
}

/** A supplier with two low products and one healthy one, and a draft for it. */
function draftOrder() {
  let supplier = makeSupplier("Draft Supplier");
  let low = makeProduct(supplier, "A-1", 2, 5);
  let edge = makeProduct(supplier, "A-2", 4, 4);
  let healthy = makeProduct(supplier, "A-3", 30, 5);
  makeProduct(makeSupplier(), "B-1", 0, 5);

  loginAs("manager");
  let order = createPurchaseOrder(supplier);

  return { supplier, low, edge, healthy, order };
}

test("purchasing", () => {
  test("a draft is built from the supplier's low stock", () => {
    let { low, edge, order } = draftOrder();

    equal(statusOf(order), "draft");
    equal(linesOf(order).map((l) => [l.productId, l.quantityOrdered]), [[low, 8], [edge, 4]]);
  });

  test("staff cannot create or send orders", () => {
    let supplier = makeSupplier();
    makeProduct(supplier, "A-1", 0, 5);
    loginAs("staff");
    let err: unknown = null;

    try {
      createPurchaseOrder(supplier);
    } catch (e) {
      err = e;
    }

    expectError(err, "Only a manager");
    equal(sql(`select 1 from purchaseOrders`).length, 0);
  });

  test("a draft takes lines from its own supplier only", () => {
    let { healthy, order } = draftOrder();
    let foreign = sql<{ id: string }>(`select id from products where sku = 'B-1'`).firstOrThrow().id;

    addLine(order, healthy, 6);
    equal(linesOf(order).length, 3);

    let err: unknown = null;

    try {
      addLine(order, foreign, 1);
    } catch (e) {
      err = e;
    }

    expectError(err, "different supplier");
  });

  test("sending marks it sent, queues the email and locks the lines", () => {
    let { order } = draftOrder();

    sendPurchaseOrder(order);

    equal(statusOf(order), "sent");

    let jobs = sql<{ n: number }>(`
      select count(*)::int as n from elements.jobs
      where path like '%send-purchase-order%' and fields->>'purchaseOrderId' = ${order}
    `).firstOrThrow();

    equal(jobs.n, 1);

    let err: unknown = null;

    try {
      setLineQuantity(linesOf(order)[0].id, 99);
    } catch (e) {
      err = e;
    }

    expectError(err, "can no longer be edited");
  });

  test("an empty draft cannot be sent", () => {
    let supplier = makeSupplier();
    loginAs("manager");
    let order = createPurchaseOrder(supplier);
    let err: unknown = null;

    try {
      sendPurchaseOrder(order);
    } catch (e) {
      err = e;
    }

    expectError(err, "at least one line");
    equal(statusOf(order), "draft");
  });

  test("receiving line by line adds to on hand and completes the order", () => {
    let { low, edge, order } = draftOrder();
    sendPurchaseOrder(order);

    session.logout();
    loginAs("staff");

    let [lowLine, edgeLine] = linesOf(order);

    receiveLine(lowLine.id, 3);
    equal(onHand(low), 5);
    equal(statusOf(order), "partially_received");

    receiveLine(lowLine.id, 5);
    receiveLine(edgeLine.id, 4);
    equal(onHand(low), 10);
    equal(onHand(edge), 8);
    equal(statusOf(order), "received");

    let receipts = sql<{ delta: number; userName: string }>(`
      select delta, userName from stockMovements
      where purchaseOrderId = ${order} and productId = ${low}
      order by createdAt, id
    `).all();

    equal(receipts, [{ delta: 3, userName: "Sam Staff" }, { delta: 5, userName: "Sam Staff" }]);
  });

  test("a line cannot receive more than was ordered", () => {
    let { order } = draftOrder();
    sendPurchaseOrder(order);
    let line = linesOf(order)[0];
    let err: unknown = null;

    try {
      receiveLine(line.id, line.quantityOrdered + 1);
    } catch (e) {
      err = e;
    }

    expectError(err, `Only ${line.quantityOrdered} left`);
    equal(statusOf(order), "sent");
  });

  test("a draft cannot be received", () => {
    let { order } = draftOrder();
    let err: unknown = null;

    try {
      receiveLine(linesOf(order)[0].id, 1);
    } catch (e) {
      err = e;
    }

    expectError(err, "Send this order");
  });

  test("receive everything remaining", () => {
    let { low, edge, order } = draftOrder();
    sendPurchaseOrder(order);
    receiveLine(linesOf(order)[0].id, 2);

    receiveAll(order);

    equal(statusOf(order), "received");
    equal(onHand(low), 10);
    equal(onHand(edge), 8);
  });

  test("the live views carry totals and product names", () => {
    let { order } = draftOrder();

    let view = purchaseOrders.view({ id: order });
    equal(view.at(0)?.lineCount, 2);
    equal(view.at(0)?.unitsOrdered, 12);
    equal(view.at(0)?.totalCents, 6000);

    let lines = poLines.view({ purchaseOrderId: order });
    equal(lines.map((l) => l.name).sort(), ["Product A-1", "Product A-2"]);
  });

  test("the supplier summary", () => {
    let { order } = draftOrder();
    let summary = purchaseOrderSummary(order);

    equal(summary.supplierName, "Draft Supplier");
    equal(summary.lines.map((l) => l.sku), ["A-1", "A-2"]);
    equal(summary.totalCents, 6000);
  });

  test("suggested quantity refills to twice the reorder point", () => {
    equal(suggestedQuantity({ onHand: 2, reorderPoint: 5 }), 8);
    equal(suggestedQuantity({ onHand: 12, reorderPoint: 5 }), 1);
  });
});
