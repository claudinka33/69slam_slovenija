import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, rows: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const rows = await sql`SELECT v.sku, v.code, v.size, v.stock, p.name, p.collection, p.price_cents, p.active
    FROM variants v JOIN products p ON p.code = v.code
    ORDER BY p.name, array_position(ARRAY['XS','S','M','L','XL','XXL'], v.size)`;
  return NextResponse.json({ ok: true, rows });
}

/** Ročni popravek zaloge (prejem blaga, inventurni popravek). */
export async function POST(req) {
  const { sku, delta, note } = await req.json().catch(() => ({}));
  const d = parseInt(delta, 10);
  if (!sku || !Number.isFinite(d) || d === 0 || Math.abs(d) > 1000)
    return NextResponse.json({ ok: false, message: "Neveljaven popravek." }, { status: 400 });
  const sql = db();
  const r = await sql`UPDATE variants SET stock = GREATEST(0, stock + ${d})
    WHERE sku = ${sku} RETURNING sku, stock`;
  if (!r.length) return NextResponse.json({ ok: false, message: "SKU ne obstaja." }, { status: 404 });
  await sql`INSERT INTO stock_moves (sku, delta, reason, note)
    VALUES (${sku}, ${d}, 'rocno', ${note || null})`;
  return NextResponse.json({ ok: true, stock: r[0].stock });
}
