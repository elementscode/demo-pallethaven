import { test, equal, session } from "@elements/app";
import { signin } from "#app/shared/services/auth";
import { expectError, makeUser } from "#app/shared/lib/fixtures";

test("signin", () => {
  test("a manager signs in with their role", () => {
    makeUser("manager", "Mia Manager", "mia.signin@test.example");

    signin(" Mia.Signin@test.example ", "secret-pass");

    equal(session.get("userName"), "Mia Manager");
    equal(session.get("role"), "manager");
  });

  test("a wrong password is refused", () => {
    makeUser("staff", "Sam Staff", "sam.signin@test.example");
    let err: unknown = null;

    try {
      signin("sam.signin@test.example", "wrong");
    } catch (e) {
      err = e;
    }

    expectError(err, "do not match");
    equal(session.isLoggedIn(), false);
  });
});
