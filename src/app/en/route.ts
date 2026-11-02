import { NextResponse } from "next/server";

// /en switches the prototype's language; ?next=/path keeps you on the same screen.
export function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set("lang", "en", { path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
