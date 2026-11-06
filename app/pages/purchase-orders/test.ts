import { test, equal } from "@elements/app";
import { STATUS_LABELS, poNumber, statusVariant } from "#app/shared/services/purchasing";

test("purchase order labels", () => {
  equal(poNumber(1004), "PO-1004");
  equal(STATUS_LABELS.partially_received, "Partially received");
  equal(statusVariant("received"), "success");
  equal(statusVariant("draft"), "outline");
});
