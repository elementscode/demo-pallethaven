import { Request, Response, redirect, session, sql } from "@elements/app";
import { products } from "#app/shared/services/inventory";
import html, { StockFilter, SupplierOption } from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let suppliers = sql<SupplierOption>(`select id, name from suppliers order by name`).all();
  let initialFilter: StockFilter = req.query.filter === "low" ? "low" : "all";

  return new html({ products: products.view(), suppliers, initialFilter });
}
