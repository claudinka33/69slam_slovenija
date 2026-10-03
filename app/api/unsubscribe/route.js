import { NextResponse } from "next/server";
import { unsubscribe as unsub } from "../../../lib/marketing";
import { SITE } from "../../../lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Odjava z enim klikom (gumb »Odjava« v Gmailu/Apple Mailu). */
export async function POST(req) {
  const u = new URL(req.url);
  const ok = await unsub(u.searchParams.get("e"), u.searchParams.get("t"));
  return NextResponse.json({ ok });
}
export async function GET(req) {
  const u = new URL(req.url);
  return NextResponse.redirect(`${SITE}/sl/odjava?e=${encodeURIComponent(u.searchParams.get("e") || "")}&t=${u.searchParams.get("t") || ""}`);
}
