import { test, equal } from "@elements/app";
import { saveSupplier } from "./template";
import { expectError, loginAs } from "#app/shared/lib/fixtures";

test("suppliers", () => {
  test("a manager adds and edits a supplier", () => {
    loginAs("manager");

    let list = saveSupplier({ id: "", name: "Northside Paper", contactName: "Jo", email: "Jo@Northside.example", error: "" });
    equal(list.map((s) => [s.name, s.email]), [["Northside Paper", "jo@northside.example"]]);

    list = saveSupplier({ ...list[0], contactName: "Jo Ray", error: "" });
    equal(list[0].contactName, "Jo Ray");
  });

  test("staff cannot change suppliers", () => {
    loginAs("staff");
    let err: unknown = null;

    try {
      saveSupplier({ id: "", name: "X", contactName: "", email: "x@x.example", error: "" });
    } catch (e) {
      err = e;
    }

    expectError(err, "Only a manager");
  });

  test("an email is required", () => {
    loginAs("manager");
    let err: unknown = null;

    try {
      saveSupplier({ id: "", name: "No Email", contactName: "", email: "nope", error: "" });
    } catch (e) {
      err = e;
    }

    expectError(err, "Enter the email");
  });
});
