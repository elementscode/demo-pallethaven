# Pallethaven

> A demo app built with [Elements](https://elements.dev).

A live stock list with low-stock flags, adjustments with a movement history, purchase orders emailed to suppliers and received line by line, and a 7am low-stock email.

**Demo:** [Pallethaven](TBD)

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
