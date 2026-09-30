import { test, equal } from "@elements/app";
import { projected } from "./template";

test("adjust preview", () => {
  equal(projected(10, { reason: "count", quantity: 7 }), 7);
  equal(projected(10, { reason: "sale", quantity: 3 }), 7);
  equal(projected(10, { reason: "damage", quantity: 1 }), 9);
});
