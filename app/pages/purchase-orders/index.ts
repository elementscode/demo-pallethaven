import { Request, Response, redirect, session, sql } from "@elements/app";
import { products } from "#app/shared/services/inventory";
import { purchaseOrders } from "#app/shared/services/purchasing";
import html, { SupplierOption } from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let suppliers = sql<SupplierOption>(`select id, name from suppliers order by name`).all();

  return new html({ orders: purchaseOrders.view(), products: products.view(), suppliers });
}
