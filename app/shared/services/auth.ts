import { sql, session, AuthError, ForbiddenError } from "@elements/app";

export type Role = "manager" | "staff";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
}

interface UserRow {
  id: string;
  name: string;
  role: Role;
}

/** @rpc */
export function signin(email: string, password: string) {
  let address = email.trim().toLowerCase();

  if (!address || !password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<UserRow>(
    `select id, name, role from users
     where email = ${address}
       and passwordHash = crypt(${password}, passwordHash)`,
  ).first();

  if (!user) {
    throw new AuthError("That email and password do not match.");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });
}

/** @rpc */
export function signout() {
  session.logout();
}

/** The signed-in user, or a 401. Every route and rpc starts here. */
export function requireUser(): CurrentUser {
  session.isLoggedInOrThrow("Sign in to continue.");

  return {
    id: session.getOrThrow("userId"),
    name: session.getOrThrow("userName"),
    role: session.getOrThrow("role"),
  };
}

/** The signed-in manager, or a 403 for staff. */
export function requireManager(): CurrentUser {
  let user = requireUser();

  if (user.role !== "manager") {
    throw new ForbiddenError("Only a manager can do that.");
  }

  return user;
}
