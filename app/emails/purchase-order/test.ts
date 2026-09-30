import { test, equal, Email } from "@elements/app";
import PurchaseOrderEmail from "#app/emails/purchase-order";

test("purchase order email", () => {
  let e = new Email({
    to: "orders@supplier.example",
    subject: "PO-1001",
    body: new PurchaseOrderEmail({
      order: {
        number: 1001,
        supplierName: "Acme",
        supplierContact: "Pat",
        supplierEmail: "orders@supplier.example",
        createdByName: "Mia Manager",
        sentAt: new Date(),
        totalCents: 2500,
        lines: [{ sku: "A-1", name: "Widget", quantityOrdered: 5, unitCostCents: 500 }],
      },
    }),
  });

  equal(e.html.includes("PO-1001"), true);
  equal(e.text.includes("Widget"), true);
  equal(e.text.includes("$25.00"), true);
});
