import { test, equal } from "@elements/app";
import { saveSupplier } from "./template";
import { expectError, loginAs } from "#app/shared/lib/fixtures";

test("suppliers", () => {
  test("a manager adds and edits a supplier", () => {
    loginAs("manager");

    let name = `Northside Paper ${Math.random().toString(36).slice(2, 8)}`;
    let added = saveSupplier({ id: "", name, contactName: "Jo", email: "Jo@Northside.example", error: "" }).filter((s) => s.name === name);
    equal(added.map((s) => [s.name, s.email]), [[name, "jo@northside.example"]]);

    let edited = saveSupplier({ ...added[0], contactName: "Jo Ray", error: "" }).filter((s) => s.id === added[0].id);
    equal(edited.map((s) => s.contactName), ["Jo Ray"]);
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
