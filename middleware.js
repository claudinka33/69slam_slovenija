import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminCookie } from "./lib/adminAuth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  // prosta pot: prijavna stran in login API
  if (pathname.startsWith("/admin/prijava") || pathname.startsWith("/api/admin/login"))
    return NextResponse.next();

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value || "";
  if (await isValidAdminCookie(cookie)) return NextResponse.next();

  if (pathname.startsWith("/api/"))
    return NextResponse.json({ ok: false, message: "Ni prijave." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/admin/prijava";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
