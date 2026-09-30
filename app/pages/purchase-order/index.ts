import { Request, Response, redirect, session, sql } from "@elements/app";
import { products } from "#app/shared/services/inventory";
import { poLines, purchaseOrders } from "#app/shared/services/purchasing";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let id = req.params.id;

  sql(`select 1 from purchaseOrders where id::text = ${id}`).firstOrThrow("No such purchase order.");

  return new html({
    orders: purchaseOrders.view({ id }),
    lines: poLines.view({ purchaseOrderId: id }),
    products: products.view(),
  });
}
