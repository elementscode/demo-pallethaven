import { Request, Response, redirect, session, sql } from "@elements/app";
import { products, stockMovements } from "#app/shared/services/inventory";
import html, { OnOrder, SupplierOption } from "./template";

export default function route(req: Request, res: Response) {
  if (!session.isLoggedIn()) {
    redirect("/signin");
    return;
  }

  let id = req.params.id;

  sql(`select 1 from products where id::text = ${id}`).firstOrThrow("No such product.");

  let suppliers = sql<SupplierOption>(`select id, name from suppliers order by name`).all();

  let onOrder = sql<OnOrder>(`
    select po.id as purchaseOrderId, po.number, l.quantityOrdered - l.quantityReceived as remaining
    from poLines l
    join purchaseOrders po on po.id = l.purchaseOrderId
    where l.productId = ${id}
      and po.status in ('sent', 'partially_received')
      and l.quantityReceived < l.quantityOrdered
    order by po.number
  `).all();

  return new html({
    products: products.view({ id }),
    movements: stockMovements.view({ productId: id }, { orderBy: "createdAt desc", limit: 25 }),
    suppliers,
    onOrder,
  });
}
