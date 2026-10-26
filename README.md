![Inventory with purchase orders, built by Claude Code on Elements: the stock list with 40 products, low-stock and out-of-stock counts, stock value at cost, and Low and In stock status pills.](https://elements.dev/demos/01a0f3a8-b040-7715-93c5-0e3201d37782/poster?v=efd1183ca526)

# Inventory with purchase orders, built by Claude Code on Elements

> Pallethaven is a full-stack app built with Claude Code on Elements.

Stock levels with low-stock flags and movement history, purchase orders emailed to suppliers and received line by line, all live.

[Run this app on your machine](https://elements.dev/demos/01a0f3a8-b040-7715-93c5-0e3201d37782). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Pallethaven needed stock counts that change as people work, a history behind every number, purchase orders sent to suppliers by email, receiving line by line and a morning list of what to reorder. Each of those is a part of Elements, so the agent spent its 19 minutes on the shop itself.

- **Live stock and orders.** Products, stock movements, purchase orders and their lines are LiveTables. When a delivery is received, the stock list, the product's history and the order's status update on every open screen.

- **A history behind every number.** Every change to a count goes through one function that adjusts the stock and records why: a count, damage, a sale or a receipt against a purchase order.

- **Purchase orders by email.** Sending an order marks it sent and queues a job in the same transaction, so the supplier's email goes out once the order is saved as sent. Staff then receive it line by line, and the order moves to partly or fully received.

- **A morning digest.** A one-line cron schedule runs a job at 7am that emails each manager the products at or under their reorder point.

- **Server calls as function calls.** Creating orders, adding lines, receiving stock and editing products call server functions straight from the page with `@rpc`.

- **Data and roles from SQL.** Migrations define the shop and seed two logins, three suppliers, forty products and four orders, one in each status. Sessions and roles let staff count and receive stock and give managers the orders and product edits.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
