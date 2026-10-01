import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stranke = agregat naročil po e-mailu (preklicana naročila se ne štejejo). */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, customers: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const rows = await sql`WITH o AS (
      SELECT lower(email) AS e, email, name, total_cents, created_at, city
      FROM orders WHERE status <> 'preklicano' AND email <> '')
    SELECT o.e AS email,
      (ARRAY_AGG(o.name ORDER BY o.created_at DESC))[1] AS name,
      (ARRAY_AGG(o.city ORDER BY o.created_at DESC))[1] AS city,
      COUNT(*)::int AS orders,
      SUM(o.total_cents)::bigint AS total_cents,
      MAX(o.created_at) AS last_order,
      MIN(o.created_at) AS first_order,
      EXISTS (SELECT 1 FROM subscribers s WHERE lower(s.email) = o.e) AS subscribed
    FROM o GROUP BY o.e
    ORDER BY MAX(o.created_at) DESC`;
  return NextResponse.json({
    ok: true,
    customers: rows.map((r) => ({ ...r, total_cents: Number(r.total_cents) })),
  });
}
