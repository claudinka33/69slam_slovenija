import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "../../../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD)
    return NextResponse.json({ ok: false, message: "ADMIN_PASSWORD še ni nastavljen v Vercelu." }, { status: 500 });
  if (body.password !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ ok: false, message: "Napačno geslo." }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminToken(), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
