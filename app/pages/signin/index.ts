import { Request, Response, redirect, session } from "@elements/app";
import html, { DemoLogin } from "./template";

/** The accounts the development seed creates. Never shown anywhere else. */
const DEMO_LOGINS: DemoLogin[] = [
  { name: "Maya Okafor", role: "Manager", email: "maya@pallethaven.shop", password: "pallet-demo" },
  { name: "Leo Park", role: "Staff", email: "leo@pallethaven.shop", password: "pallet-demo" },
];

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/");
    return;
  }

  let demoLogins = process.env.ENV === "development" ? DEMO_LOGINS : [];

  return new html({ demoLogins });
}
