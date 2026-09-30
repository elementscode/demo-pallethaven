import { Request, Response, redirect, session } from "@elements/app";
import { products } from "#app/shared/services/inventory";
import { purchaseOrders } from "#app/shared/services/purchasing";
import html, { listSuppliers } from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  return new html({ initial: listSuppliers(), products: products.view(), orders: purchaseOrders.view() });
}
