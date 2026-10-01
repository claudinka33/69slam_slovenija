import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema, catalogMeta } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cenik: prodajna cena (z DDV), nabavna cena (brez DDV), zaloga, vrednost zaloge. */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, products: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const rows = await sql`SELECT p.code, p.name, p.price_cents, p.cost_cents, p.active,
      COALESCE(SUM(v.stock), 0)::int AS stock, ARRAY_AGG(v.sku ORDER BY v.sku) AS skus
    FROM products p LEFT JOIN variants v ON v.code = p.code GROUP BY p.code ORDER BY p.name`;
  const meta = catalogMeta();
  return NextResponse.json({
    ok: true,
    products: rows.map((r) => {
      const m = meta[r.code] || {};
      return { ...r, img: m.img || null, gender: m.gender || "moski", group: m.group || "boksarice", type: m.type || null };
    }),
  });
}

/**
 * Nastavi nabavne cene (brez DDV): { items: [{ key, cost }] }
 * key je lahko koda izdelka (MBYADD) ali SKU (MBYADD-M) — cena velja za cel izdelek.
 */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const { items } = await req.json().catch(() => ({}));
  const list = (Array.isArray(items) ? items : [])
    .map((i) => ({ key: String(i?.key || "").trim().toUpperCase(), cost: Math.round(parseFloat(String(i?.cost ?? "").replace(",", ".")) * 100) }))
    .filter((i) => i.key && Number.isFinite(i.cost) && i.cost >= 0 && i.cost < 10000000);
  if (!list.length) return NextResponse.json({ ok: false, message: "Ni veljavnih nabavnih cen." }, { status: 400 });
  const sql = db();
  await ensureSchema();
  const r = await sql`WITH t AS (SELECT * FROM unnest(${list.map((i) => i.key)}::text[], ${list.map((i) => i.cost)}::int[]) AS t(k, c)),
    m AS (SELECT DISTINCT ON (code) code, c FROM (
        SELECT p.code, t.c FROM t JOIN products p ON upper(p.code) = t.k
        UNION ALL
        SELECT v.code, t.c FROM t JOIN variants v ON upper(v.sku) = t.k) x ORDER BY code)
    UPDATE products p SET cost_cents = m.c FROM m WHERE p.code = m.code RETURNING p.code`;
  return NextResponse.json({ ok: true, updated: r.length, unknown: list.length - r.length,
    message: `Nabavne cene posodobljene za ${r.length} izdelkov${list.length - r.length > 0 ? ` (${list.length - r.length} neznanih šifer preskočenih)` : ""}.` });
}
