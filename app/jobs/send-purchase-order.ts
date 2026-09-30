import { Job, email } from "@elements/app";
import PurchaseOrderEmail from "#app/emails/purchase-order";
import { purchaseOrderSummary, poNumber } from "#app/shared/services/purchasing";

export interface SendPurchaseOrderJobFields {
  purchaseOrderId: string;
}

/**
 * Emails a sent purchase order to its supplier. Scheduled inside the send
 * transaction, so it only runs once the order is marked sent.
 */
export class SendPurchaseOrderJob extends Job<SendPurchaseOrderJobFields> {
  static maxAttempts = 5;

  run() {
    let order = purchaseOrderSummary(this.fields.purchaseOrderId);

    email({
      to: order.supplierEmail,
      subject: `Purchase order ${poNumber(order.number)} from Pallethaven`,
      body: new PurchaseOrderEmail({ order }),
    });
  }
}
