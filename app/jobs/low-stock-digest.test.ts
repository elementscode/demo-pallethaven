import { test, equal, Email } from "@elements/app";
import LowStockEmail from "#app/emails/low-stock";
import { LowStockDigestJob } from "#app/jobs/low-stock-digest";
import { lowStockProducts } from "#app/shared/services/inventory";
import { makeProduct, makeSupplier, makeUser } from "#app/shared/lib/fixtures";

test("low stock digest", () => {
  test("lists only products at or under their reorder point", () => {
    let supplier = makeSupplier();
    makeProduct(supplier, "D-1", 0, 3);
    makeProduct(supplier, "D-2", 3, 3);
    makeProduct(supplier, "D-3", 4, 3);

    equal(lowStockProducts().map((p) => p.sku), ["D-1", "D-2"]);
  });

  test("the email names each product", () => {
    let supplier = makeSupplier();
    makeProduct(supplier, "D-1", 0, 3);

    let e = new Email({
      to: "mia@test.example",
      subject: "low stock",
      body: new LowStockEmail({ name: "Mia", products: lowStockProducts() }),
    });

    equal(e.html.includes("D-1"), true);
    equal(e.text.includes("1 products need reordering"), true);
  });

  test("the job runs with managers and low stock", () => {
    makeUser("manager");
    makeProduct(makeSupplier(), "D-1", 0, 3);

    new LowStockDigestJob({}).run();
  });
});
