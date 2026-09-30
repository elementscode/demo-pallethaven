import { test, equal, session, sql } from "@elements/app";
import { adjustStock, createProduct, formatMoney, isLow, parseMoney, products, updateProduct } from "#app/shared/services/inventory";
import { expectError, loginAs, makeProduct, makeSupplier, onHand, suffix } from "#app/shared/lib/fixtures";

interface MovementRow {
  delta: number;
  quantityAfter: number;
  reason: string;
  note: string;
  userName: string;
}

function movements(productId: string): MovementRow[] {
  return sql<MovementRow>(`
    select delta, quantityAfter, reason, note, userName
    from stockMovements where productId = ${productId}
    order by createdAt, id
  `).all();
}

test("inventory", () => {
  test("a sale takes units off and is kept in the history", () => {
    loginAs("staff");
    let product = makeProduct(makeSupplier(), `INV-1-${suffix()}`, 10, 4);

    adjustStock({ productId: product, reason: "sale", quantity: 3, note: " counter sale " });

    equal(onHand(product), 7);
    equal(movements(product), [{ delta: -3, quantityAfter: 7, reason: "sale", note: "counter sale", userName: "Sam Staff" }]);
  });

  test("a count sets the quantity to what was counted", () => {
    loginAs("staff");
    let product = makeProduct(makeSupplier(), `INV-1-${suffix()}`, 10, 4);

    adjustStock({ productId: product, reason: "count", quantity: 14, note: "" });
    adjustStock({ productId: product, reason: "count", quantity: 14, note: "recount" });

    equal(onHand(product), 14);
    equal(movements(product).map((m) => [m.delta, m.quantityAfter]), [[4, 14], [0, 14]]);
  });

  test("damage cannot take more than is on hand", () => {
    loginAs("staff");
    let product = makeProduct(makeSupplier(), `INV-1-${suffix()}`, 2, 4);
    let err: unknown = null;

    try {
      adjustStock({ productId: product, reason: "damage", quantity: 3, note: "" });
    } catch (e) {
      err = e;
    }

    expectError(err, "Only 2 on hand");
    equal(onHand(product), 2);
    equal(movements(product).length, 0);
  });

  test("adjusting needs a signed-in user", () => {
    let product = makeProduct(makeSupplier(), `INV-1-${suffix()}`, 5, 1);
    let err: unknown = null;

    try {
      adjustStock({ productId: product, reason: "sale", quantity: 1, note: "" });
    } catch (e) {
      err = e;
    }

    expectError(err, "Sign in");
    equal(onHand(product), 5);
  });

  test("only a manager creates products, with an opening count", () => {
    let supplier = makeSupplier();
    let sku = `n-1-${suffix()}`;
    loginAs("staff");
    let err: unknown = null;

    try {
      createProduct({ sku, name: "New", supplierId: supplier, cost: "4.25", onHand: 6, reorderPoint: 2 });
    } catch (e) {
      err = e;
    }

    expectError(err, "Only a manager");

    session.logout();
    loginAs("manager");
    let id = createProduct({ sku, name: "New", supplierId: supplier, cost: "$4.25", onHand: 6, reorderPoint: 2 });

    let row = sql<{ sku: string; costCents: number; onHand: number }>(
      `select sku, costCents, onHand from products where id = ${id}`,
    ).firstOrThrow();

    equal(row, { sku: sku.toUpperCase(), costCents: 425, onHand: 6 });
    equal(movements(id).map((m) => [m.reason, m.delta]), [["count", 6]]);
  });

  test("a manager edits the reorder point", () => {
    let supplier = makeSupplier();
    let product = makeProduct(supplier, `INV-1-${suffix()}`, 5, 1);
    loginAs("manager");

    updateProduct({ productId: product, name: "Renamed", supplierId: supplier, cost: "3", reorderPoint: 8 });

    let row = sql<{ name: string; reorderPoint: number; costCents: number }>(
      `select name, reorderPoint, costCents from products where id = ${product}`,
    ).firstOrThrow();

    equal(row, { name: "Renamed", reorderPoint: 8, costCents: 300 });
  });

  test("the live view carries the supplier name", () => {
    let name = `Acme Goods ${suffix()}`;
    let supplier = makeSupplier(name);
    let product = makeProduct(supplier, `INV-1-${suffix()}`, 5, 1);

    let view = products.view({ id: product });

    equal(view.length, 1);
    equal(view.at(0)?.supplierName, name);
  });

  test("helpers", () => {
    equal(isLow({ onHand: 4, reorderPoint: 4 }), true);
    equal(isLow({ onHand: 5, reorderPoint: 4 }), false);
    equal(parseMoney("12.5"), 1250);
    equal(parseMoney("1,200.00"), 120000);
    equal(parseMoney("abc"), null);
    equal(formatMoney(123456), "$1,234.56");
  });
});
