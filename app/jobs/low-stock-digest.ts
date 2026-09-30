import { Job, email, sql } from "@elements/app";
import LowStockEmail from "#app/emails/low-stock";
import { lowStockProducts } from "#app/shared/services/inventory";

export interface LowStockDigestJobFields {}

/**
 * The morning digest: every manager gets the list of products at or under
 * their reorder point. Nothing is sent on a morning when nothing is low.
 */
export class LowStockDigestJob extends Job<LowStockDigestJobFields> {
  static maxAttempts = 3;

  run() {
    let products = lowStockProducts();

    if (products.length === 0) {
      return;
    }

    let managers = sql<{ name: string; email: string }>(
      `select name, email from users where role = 'manager' order by name`,
    ).all();

    for (let manager of managers) {
      email({
        to: manager.email,
        subject: `${products.length} products at or under their reorder point`,
        body: new LowStockEmail({ name: manager.name.split(" ")[0], products }),
      });
    }
  }
}
