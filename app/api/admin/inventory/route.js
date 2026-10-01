import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Potrditev inventure: { counts: [{ sku, counted }], note? }
 * Za vsak SKU nastavi zalogo na prešteto količino in zapiše razliko v stock_moves (razlog "inventura").
 * SKU-ji, ki jih ni na seznamu, ostanejo nespremenjeni.
 */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body.counts) ? body.counts : [];
  const clean = [];
  const seen = new Set();
  for (const c of list) {
    const sku = String(c?.sku || "").trim();
    const n = parseInt(c?.counted, 10);
    if (!sku || seen.has(sku) || !Number.isFinite(n) || n < 0 || n > 100000) continue;
    seen.add(sku);
    clean.push({ sku, n });
  }
  if (!clean.length) return NextResponse.json({ ok: false, message: "Ni preštetih količin za shranjevanje." }, { status: 400 });

  const note = (String(body.note || "").trim() || `Inventura ${new Date().toLocaleDateString("sl-SI", { timeZone: "Europe/Ljubljana" })}`).slice(0, 200);
  const sql = db();
  await ensureSchema();
  const rows = await sql`WITH c AS (
      SELECT * FROM unnest(${clean.map((x) => x.sku)}::text[], ${clean.map((x) => x.n)}::int[]) AS t(sku, cnt)
    ), old AS (
      SELECT v.sku, v.stock AS was FROM variants v JOIN c ON c.sku = v.sku
    ), upd AS (
      UPDATE variants v SET stock = c.cnt FROM c, old
      WHERE v.sku = c.sku AND old.sku = c.sku AND old.was <> c.cnt
      RETURNING v.sku, c.cnt - old.was AS delta
    ), mv AS (
      INSERT INTO stock_moves (sku, delta, reason, note)
      SELECT sku, delta, 'inventura', ${note} FROM upd
      RETURNING sku, delta
    )
    SELECT (SELECT COUNT(*) FROM old)::int AS found,
           (SELECT COUNT(*) FROM mv)::int AS changed,
           (SELECT COALESCE(SUM(delta), 0) FROM mv)::int AS net`;
  const r = rows[0];
  return NextResponse.json({
    ok: true,
    found: r.found,
    changed: r.changed,
    net: r.net,
    unknown: clean.length - r.found,
    message: `Inventura shranjena: ${r.changed} sprememb (neto ${r.net > 0 ? "+" : ""}${r.net} kosov), ${r.found - r.changed} brez razlike.`,
  });
}
