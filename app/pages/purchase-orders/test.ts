import { test, equal } from "@elements/app";
import { STATUS_LABELS, poNumber, statusIntent } from "#app/shared/services/purchasing";

test("purchase order labels", () => {
  equal(poNumber(1004), "PO-1004");
  equal(STATUS_LABELS.partially_received, "Partially received");
  equal(statusIntent("received"), "is-success");
  equal(statusIntent("draft"), "");
});
