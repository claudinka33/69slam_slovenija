import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stranke = naročila po e-mailu + stranke, uvožene iz Shopifyja (shop_customers).
 * Število naročil = nova trgovina + MAX(uvožena Shopify naročila, Shopifyjev števec naročil) — brez podvajanja.
 * Preklicana naročila se ne štejejo.
 */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, customers: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const rows = await sql`WITH o AS (
      SELECT lower(email) AS e, name, city, total_cents, created_at, source
      FROM orders WHERE status <> 'preklicano' AND email <> ''),
    agg AS (
      SELECT e,
        COUNT(*) FILTER (WHERE source <> 'shopify') AS wn,
        COALESCE(SUM(total_cents) FILTER (WHERE source <> 'shopify'), 0) AS ws,
        COUNT(*) FILTER (WHERE source = 'shopify') AS sn,
        COALESCE(SUM(total_cents) FILTER (WHERE source = 'shopify'), 0) AS ss,
        MAX(created_at) AS last_order, MIN(created_at) AS first_order,
        (ARRAY_AGG(name ORDER BY created_at DESC))[1] AS name,
        (ARRAY_AGG(city ORDER BY created_at DESC))[1] AS city
      FROM o GROUP BY e),
    allc AS (
      SELECT COALESCE(a.e, s.email) AS email,
        COALESCE(NULLIF(a.name, ''), NULLIF(s.name, ''), COALESCE(a.e, s.email)) AS name,
        COALESCE(NULLIF(NULLIF(a.city, '-'), ''), s.city) AS city,
        (COALESCE(a.wn, 0) + GREATEST(COALESCE(a.sn, 0), COALESCE(s.orders_count, 0)))::int AS orders,
        (COALESCE(a.ws, 0) + GREATEST(COALESCE(a.ss, 0), COALESCE(s.total_cents, 0)))::bigint AS total_cents,
        a.last_order, a.first_order,
        (s.email IS NOT NULL) AS from_shopify
      FROM agg a FULL OUTER JOIN shop_customers s ON s.email = a.e)
    SELECT allc.*, EXISTS (SELECT 1 FROM subscribers x WHERE lower(x.email) = allc.email) AS subscribed
    FROM allc
    ORDER BY allc.last_order DESC NULLS LAST, allc.total_cents DESC`;
  return NextResponse.json({
    ok: true,
    customers: rows.map((r) => ({ ...r, total_cents: Number(r.total_cents) })),
  });
}
