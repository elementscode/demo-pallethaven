import { errorf, session, sql } from "@elements/app";

/**
 * Rows the tests build on. The test database has no seed data.
 *
 * Test files run concurrently, each in its own transaction, so every unique
 * value here (an email, a supplier name) carries a random suffix: two open
 * transactions inserting the same unique key wait on each other.
 */

function suffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function makeUser(
  role: "manager" | "staff",
  name: string = role === "manager" ? "Mia Manager" : "Sam Staff",
  email: string = `${name.toLowerCase().replace(/\s+/g, ".")}.${suffix()}@test.example`,
) {
  return sql<{ id: string; name: string }>(`
    insert into users (email, name, role, passwordHash)
    values (${email}, ${name}, ${role}, crypt('secret-pass', genSalt('bf', 4)))
    returning id, name
  `).firstOrThrow();
}

export function loginAs(role: "manager" | "staff") {
  let user = makeUser(role);
  session.login({ userId: user.id, userName: user.name, role });

  return user;
}

export function makeSupplier(name: string = `Test Supplier ${suffix()}`) {
  return sql<{ id: string }>(`
    insert into suppliers (name, contactName, email)
    values (${name}, 'Pat', ${`${name.toLowerCase().replace(/\W+/g, "")}@supplier.example`})
    returning id
  `).firstOrThrow().id;
}

export function makeProduct(supplierId: string, sku: string, onHand: number, reorderPoint: number, costCents: number = 500) {
  return sql<{ id: string }>(`
    insert into products (sku, name, supplierId, costCents, onHand, reorderPoint)
    values (${sku}, ${`Product ${sku}`}, ${supplierId}, ${costCents}, ${onHand}, ${reorderPoint})
    returning id
  `).firstOrThrow().id;
}

export function onHand(productId: string): number {
  return sql<{ onHand: number }>(`select onHand from products where id = ${productId}`).firstOrThrow().onHand;
}

/** Records an error unless `err` is an error whose message contains `text`. */
export function expectError(err: unknown, text: string) {
  if (!err) {
    errorf("expected an error containing %v, nothing was thrown", text);
    return;
  }

  let message = String((err as Error).message);

  if (!message.includes(text)) {
    errorf("expected an error containing %v, got %v", text, message);
  }
}
