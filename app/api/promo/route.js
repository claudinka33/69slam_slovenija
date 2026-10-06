import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../lib/db";
import { PROMO_CODE } from "../../../lib/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ali je oglaševana koda trenutno veljavna? → { ok, code, percent, min } */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false });
  try {
    const sql = db();
    await ensureSchema();
    const [k] = await sql`SELECT * FROM coupons WHERE code = ${PROMO_CODE}`;
    const now = Date.now();
    const live = k && k.active
      && !(k.starts_at && new Date(k.starts_at).getTime() > now)
      && !(k.expires_at && new Date(k.expires_at).getTime() < now);
    if (!live) return NextResponse.json({ ok: false });
    return NextResponse.json(
      { ok: true, code: k.code, percent: k.percent, min: (k.min_order_cents || 0) / 100 },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch {
    return NextResponse.json({ ok: false });
  }
}
