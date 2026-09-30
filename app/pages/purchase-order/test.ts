import { test, equal } from "@elements/app";
import { poLines, purchaseOrders, createPurchaseOrder } from "#app/shared/services/purchasing";
import { loginAs, makeProduct, makeSupplier } from "#app/shared/lib/fixtures";

test("purchase order page data", () => {
  let supplier = makeSupplier();
  makeProduct(supplier, "P-1", 1, 4);
  loginAs("manager");
  let order = createPurchaseOrder(supplier);

  equal(purchaseOrders.view({ id: order }).at(0)?.status, "draft");
  equal(poLines.view({ purchaseOrderId: order }).at(0)?.quantityOrdered, 7);
});
