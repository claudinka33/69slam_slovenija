import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminCookie } from "./lib/adminAuth";
import { lockedNow, MAINTENANCE_UNTIL, PREVIEW_COOKIE, PREVIEW_KEY } from "./lib/maintenance";

export async function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdmin) {
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

  // trgovina v pripravi
  if (!lockedNow() || pathname === "/vzdrzevanje" || /^\/(sl|hr|en)\/info\//.test(pathname)) return NextResponse.next();
  if (searchParams.get("predogled") === PREVIEW_KEY) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("predogled");
    const res = NextResponse.redirect(url);
    res.cookies.set(PREVIEW_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: true });
    return res;
  }
  if (req.cookies.get(PREVIEW_COOKIE)?.value === "1") return NextResponse.next();
  if (await isValidAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value || "")) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/vzdrzevanje";
  url.search = "";
  const res = NextResponse.rewrite(url, { status: 503 });
  const left = MAINTENANCE_UNTIL ? Math.ceil((Date.parse(MAINTENANCE_UNTIL) - Date.now()) / 1000) : 0;
  res.headers.set("Retry-After", String(left > 0 ? left : 86400));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  // vse strani razen notranjih datotek, slik in javnih API-jev (Stripe, cron, prijava na novice …)
  matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!api/|_next/|favicon|robots.txt|sitemap.xml|img/|brand/|furs/|.*\\.[a-z0-9]{2,5}$).*)"],
};
