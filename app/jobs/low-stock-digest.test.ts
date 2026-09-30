import { test, equal, Email } from "@elements/app";
import LowStockEmail from "#app/emails/low-stock";
import { LowStockDigestJob } from "#app/jobs/low-stock-digest";
import { lowStockProducts } from "#app/shared/services/inventory";
import { makeProduct, makeSupplier, makeUser, suffix, supplierName } from "#app/shared/lib/fixtures";

/** The low stock rows belonging to one supplier, so seed products stay out of the picture. */
function lowStockFor(supplierId: string) {
  let name = supplierName(supplierId);

  return lowStockProducts().filter((p) => p.supplierName === name);
}

test("low stock digest", () => {
  test("lists only products at or under their reorder point", () => {
    let supplier = makeSupplier();
    let tag = suffix();
    makeProduct(supplier, `D-1-${tag}`, 0, 3);
    makeProduct(supplier, `D-2-${tag}`, 3, 3);
    makeProduct(supplier, `D-3-${tag}`, 4, 3);

    equal(lowStockFor(supplier).map((p) => p.sku), [`D-1-${tag}`, `D-2-${tag}`]);
  });

  test("the email names each product", () => {
    let supplier = makeSupplier();
    makeProduct(supplier, `D-1-${suffix()}`, 0, 3);

    let e = new Email({
      to: "mia@test.example",
      subject: "low stock",
      body: new LowStockEmail({ name: "Mia", products: lowStockFor(supplier) }),
    });

    equal(e.html.includes("D-1"), true);
    equal(e.text.includes("1 products need reordering"), true);
  });

  test("the job runs with managers and low stock", () => {
    makeUser("manager");
    makeProduct(makeSupplier(), `D-1-${suffix()}`, 0, 3);

    new LowStockDigestJob({}).run();
  });
});
