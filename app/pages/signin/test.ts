import { test, equal, session } from "@elements/app";
import { signin } from "#app/shared/services/auth";
import { expectError, makeUser, suffix } from "#app/shared/lib/fixtures";

test("signin", () => {
  test("a manager signs in with their role", () => {
    let tag = suffix();
    makeUser("manager", "Mia Manager", `mia.signin.${tag}@test.example`);

    signin(` Mia.Signin.${tag}@test.example `, "secret-pass");

    equal(session.get("userName"), "Mia Manager");
    equal(session.get("role"), "manager");
  });

  test("a wrong password is refused", () => {
    let email = `sam.signin.${suffix()}@test.example`;
    makeUser("staff", "Sam Staff", email);
    let err: unknown = null;

    try {
      signin(email, "wrong");
    } catch (e) {
      err = e;
    }

    expectError(err, "do not match");
    equal(session.isLoggedIn(), false);
  });
});
