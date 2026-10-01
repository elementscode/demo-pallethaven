![Pallethaven, an inventory and purchasing app built with Elements: the stock list with 40 products, low-stock and out-of-stock counts, stock value at cost, and Low and In stock status pills.](https://elements.dev/demos/01a0f3a8-b040-7715-93c5-0e3201d37782/poster?v=efd1183ca526)

# Pallethaven

> A demo app built with [Elements](https://elements.dev).

Stock levels with low-stock flags and movement history, purchase orders emailed to suppliers and received line by line, all live.

**Demo:** [Pallethaven](https://elements.dev/demos/01a0f3a8-b040-7715-93c5-0e3201d37782)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 19 min
- **Cost:** $7.71 at API rates, September 2026

## Get started

```bash
elements create pallethaven -scaffold=elementscode/demo-pallethaven
```

## How it's built

Pallethaven needed stock counts that change as people work, a history behind every number, purchase orders sent to suppliers by email, receiving line by line and a morning list of what to reorder. Each of those is a part of Elements, so the agent spent its 19 minutes on the shop itself.

### What Elements gave the app

- **Live stock and orders.** `products` and `stockMovements` in `app/shared/services/inventory.ts`, and `purchaseOrders` and `poLines` in `purchasing.ts`, are LiveTables fed by notify triggers in the schema migration. When a delivery is received, the stock list, the product's history and the order's status update on every open screen.
- **A history behind every number.** `adjustStock` and `receiveLine` lock the product row and call one `recordMovement`, which changes the on-hand count and writes the movement that explains it: a count, damage, a sale or a receipt against a purchase order.
- **Purchase orders by email.** `sendPurchaseOrder` marks a draft sent and schedules `SendPurchaseOrderJob` in the same transaction, so the supplier's email goes out only when the status change commits. The email is the `purchase-order` template in `app/emails/`.
- **A morning digest.** One line in `index.ts` runs `LowStockDigestJob` every day at 7am, and each manager gets the `low-stock` email listing every product at or under its reorder point.
- **Server calls as function calls.** Pages call `@rpc` functions such as `createPurchaseOrder`, `addLine`, `receiveAll` and `updateProduct` straight from the template.
- **Data and roles from SQL.** Two migrations define the shop and seed two logins, three suppliers, forty products and four orders, one in each status. `requireUser` and `requireManager` in `app/shared/services/auth.ts` let staff count and receive stock and give managers the orders and product edits.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 33 tests pass. Every page works on desktop and phone.

Start in `app/shared/services/purchasing.ts`.

## Demo accounts

The seed creates three suppliers (Cedar & Pine Home Goods, Brightline
Electrical Co., Harbor Pantry Wholesale), forty products with twelve at or
under their reorder point and one out of stock, a movement history for each
product, and four purchase orders: one draft, one sent, one partially received
and one received. It also creates two accounts. Both passwords are
`pallet-demo`, and the sign-in page lists them.

| Email                 | Role    |
| --------------------- | ------- |
| maya@pallethaven.shop | manager |
| leo@pallethaven.shop  | staff   |

In development, supplier and digest emails are written to the job log, not
sent. To send them, set `EMAIL_LIVE=true` and your SMTP settings in
`config/env/production.env`, and change the sender address in `config.jsoc`.

## The prompt

```text
Build an inventory and purchasing app named pallethaven for a small retail
business with one warehouse.

Two kinds of accounts: manager and staff.

- Products: SKU, name, supplier, cost, on-hand quantity, reorder point.
- Stock list with search, and a "low stock" filter for anything at or under
  its reorder point.
- Adjust stock with a reason (count, damage, sale). Every change is kept in a
  movement history per product.
- Suppliers with contact email.
- Purchase orders: a manager builds a PO for one supplier from low-stock
  products, sends it (emails the supplier a summary), and staff receive it
  line by line, which adds to on-hand quantity. PO status: draft, sent,
  partially received, received.
- Every morning at 7am, email managers the list of low-stock products.

Seed one manager, one staff member, three suppliers, forty products (some
below reorder point), and four POs across statuses. Show the seeded logins on
the sign-in page.

Stock levels and PO status update in real time.
```

## License

MIT. See [LICENSE](LICENSE).
