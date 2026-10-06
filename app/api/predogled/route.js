import { NextResponse } from "next/server";
import { PREVIEW_COOKIE, PREVIEW_PASS } from "../../../lib/maintenance";

export async function POST(req) {
  let geslo = "";
  try { geslo = String((await req.json())?.geslo || "").trim().toLowerCase(); } catch {}
  if (geslo !== PREVIEW_PASS) return NextResponse.json({ ok: false, message: "Napačno geslo." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PREVIEW_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: true });
  return res;
}
