import { NextResponse } from "next/server";
import { dbConfigured } from "../../../../lib/db";
import { computeRvc } from "../../../../lib/rvc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Čisti RVC od prodaje: ?from=YYYY-MM-DD&to=YYYY-MM-DD (vključno). Izračun v lib/rvc.js. */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const u = new URL(req.url);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("from") || "") ? u.searchParams.get("from") : "2000-01-01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("to") || "") ? u.searchParams.get("to") : "2100-01-01";
  return NextResponse.json(await computeRvc(from, to));
}
