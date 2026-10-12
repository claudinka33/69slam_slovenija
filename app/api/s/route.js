import { NextResponse } from "next/server";
import { dbConfigured } from "../../../lib/db";
import { recordEvent, sourceOf } from "../../../lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Anonimna statistika obiska (brez piškotkov). Telo: {k, p, r?, q?, first?, i?, v?} */
export async function POST(req) {
  if (!dbConfigured()) return new NextResponse(null, { status: 204 });
  let b = {};
  try { b = JSON.parse((await req.text()).slice(0, 4000) || "{}"); } catch {}
  const kind = String(b.k || "");
  let source = null, campaign = null;
  if (kind === "view" && b.first) {
    const host = req.headers.get("host") || "";
    source = sourceOf(typeof b.r === "string" ? b.r : "", typeof b.q === "string" ? b.q : "", host);
    try { campaign = new URLSearchParams(b.q || "").get("utm_campaign"); } catch {}
  }
  await recordEvent(req, {
    kind,
    path: typeof b.p === "string" ? b.p : null,
    source,
    campaign,
    item: typeof b.i === "string" ? b.i : null,
    value_cents: Number.isFinite(Number(b.v)) && b.v !== null && b.v !== undefined ? Number(b.v) * 100 : undefined,
  });
  return new NextResponse(null, { status: 204 });
}
