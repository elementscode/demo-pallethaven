import { test, equal } from "@elements/app";
import { Product } from "#app/shared/services/inventory";
import { matches } from "./template";

function product(sku: string, onHand: number, reorderPoint: number): Product {
  return {
    id: sku,
    sku,
    name: `Item ${sku}`,
    supplierId: "s",
    supplierName: "Harbor Pantry",
    costCents: 100,
    onHand,
    reorderPoint,
    updatedAt: new Date(),
  };
}

test("stock filter", () => {
  let low = product("HP-1", 2, 5);
  let ok = product("CP-2", 9, 5);

  equal(matches(low, { filter: "low", search: "" }), true);
  equal(matches(ok, { filter: "low", search: "" }), false);
  equal(matches(ok, { filter: "all", search: "cp-2" }), true);
  equal(matches(ok, { filter: "all", search: "harbor" }), true);
  equal(matches(ok, { filter: "all", search: "nothing" }), false);
});
