import { App } from "@elements/app";
import config from "#config";
import stock from "#app/pages/stock";
import signin from "#app/pages/signin";
import product from "#app/pages/product";
import suppliers from "#app/pages/suppliers";
import purchaseOrdersPage from "#app/pages/purchase-orders";
import purchaseOrderPage from "#app/pages/purchase-order";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";
import { LowStockDigestJob } from "#app/jobs/low-stock-digest";

const app = new App();

app.route("/", stock);
app.route("/signin", signin);
app.route("/products/:id", product);
app.route("/purchase-orders", purchaseOrdersPage);
app.route("/suppliers", suppliers);
app.route("/purchase-orders/:id", purchaseOrderPage);

app.cron("every day at 7am", "low stock digest", () => new LowStockDigestJob().schedule());

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
