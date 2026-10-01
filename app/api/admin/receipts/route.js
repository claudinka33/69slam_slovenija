import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Seznam prevzemov (z vrsticami). */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, receipts: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const rec = await sql`SELECT id, number, to_char(doc_date, 'YYYY-MM-DD') AS doc_date, supplier, doc_ref, note, total_cents, created_at
    FROM receipts ORDER BY doc_date DESC, id DESC LIMIT 500`;
  const items = rec.length ? await sql`SELECT receipt_id, sku, code, name, size, qty, cost_cents
    FROM receipt_items WHERE receipt_id = ANY(${rec.map((r) => r.id)}) ORDER BY id` : [];
  const by = {};
  for (const it of items) (by[it.receipt_id] = by[it.receipt_id] || []).push(it);
  const suppliers = await sql`SELECT DISTINCT supplier FROM receipts WHERE supplier <> '' ORDER BY 1`;
  return NextResponse.json({
    ok: true,
    receipts: rec.map((r) => ({ ...r, id: Number(r.id), items: by[r.id] || [] })),
    suppliers: suppliers.map((s) => s.supplier),
  });
}

/**
 * Nov prevzem: { doc_date, supplier, doc_ref, note, lines: [{ sku, qty, cost }] }  (cost = nabavna cena/kos brez DDV v €)
 * Poveča zalogo, zapiše stock_moves (razlog "prejem") in posodobi povprečno nabavno ceno izdelka.
 */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const raw = Array.isArray(b.lines) ? b.lines : [];
  const merged = new Map();
  for (const l of raw) {
    const size = String(l?.size || "").trim().toUpperCase().slice(0, 20);
    const code = String(l?.code || "").trim().toUpperCase();
    const sku = String(l?.sku || (code && size ? `${code}-${size.replace(/\s+/g, "")}` : "")).trim().toUpperCase();
    const qty = parseInt(l?.qty, 10);
    const cost = Math.round(parseFloat(String(l?.cost ?? "").replace(",", ".")) * 100);
    if (!sku || !Number.isFinite(qty) || qty <= 0 || qty > 100000 || !Number.isFinite(cost) || cost < 0) continue;
    const m = merged.get(sku);
    if (m) { m.cost = Math.round((m.cost * m.qty + cost * qty) / (m.qty + qty)); m.qty += qty; }
    else merged.set(sku, { sku, qty, cost, code, size });
  }
  const lines = [...merged.values()];
  if (!lines.length) return NextResponse.json({ ok: false, message: "Dodaj vsaj eno vrstico s količino in nabavno ceno." }, { status: 400 });

  const sql = db();
  await ensureSchema();
  let vars = await sql`SELECT v.sku, v.code, v.size, p.name FROM variants v JOIN products p ON p.code = v.code
    WHERE v.sku = ANY(${lines.map((l) => l.sku)})`;
  // nove velikosti obstoječih izdelkov: ustvari variante (zaloga 0, prevzem jo poveča)
  const known = new Set(vars.map((v) => v.sku));
  const fresh = lines.filter((l) => !known.has(l.sku) && l.code && l.size);
  if (fresh.length) {
    const prodOk = await sql`SELECT code FROM products WHERE code = ANY(${fresh.map((l) => l.code)})`;
    const okCodes = new Set(prodOk.map((p) => p.code));
    const mk = fresh.filter((l) => okCodes.has(l.code));
    if (mk.length) {
      await sql`INSERT INTO variants (sku, code, size, stock)
        SELECT s, c, z, 0 FROM unnest(${mk.map((l) => l.sku)}::text[], ${mk.map((l) => l.code)}::text[], ${mk.map((l) => l.size)}::text[]) AS t(s, c, z)
        ON CONFLICT (sku) DO NOTHING`;
      vars = await sql`SELECT v.sku, v.code, v.size, p.name FROM variants v JOIN products p ON p.code = v.code
        WHERE v.sku = ANY(${lines.map((l) => l.sku)})`;
    }
  }
  const vmap = Object.fromEntries(vars.map((v) => [v.sku, v]));
  const unknown = lines.filter((l) => !vmap[l.sku]).map((l) => l.sku);
  if (unknown.length) return NextResponse.json({ ok: false, message: `Neznani SKU: ${unknown.slice(0, 8).join(", ")}` }, { status: 400 });

  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.doc_date || "")) ? b.doc_date : new Date().toISOString().slice(0, 10);
  const year = date.slice(0, 4);
  const [{ n }] = await sql`SELECT nextval('receipt_number_seq')::int AS n`;
  const number = `P-${year}-${String(n).padStart(4, "0")}`;
  const total = lines.reduce((a, l) => a + l.qty * l.cost, 0);

  // povprečna nabavna cena: (obstoječa zaloga × stara cena + prejem × nova cena) / skupaj — na nivoju izdelka
  const codes = [...new Set(lines.map((l) => vmap[l.sku].code))];
  const prods = await sql`SELECT p.code, p.cost_cents, COALESCE(SUM(v.stock), 0)::int AS stock
    FROM products p LEFT JOIN variants v ON v.code = p.code WHERE p.code = ANY(${codes}) GROUP BY p.code, p.cost_cents`;
  const newCost = {};
  for (const p of prods) {
    const rl = lines.filter((l) => vmap[l.sku].code === p.code);
    const q = rl.reduce((a, l) => a + l.qty, 0);
    const v = rl.reduce((a, l) => a + l.qty * l.cost, 0);
    const oldStock = Math.max(0, p.stock);
    newCost[p.code] = p.cost_cents == null || oldStock === 0 ? Math.round(v / q) : Math.round((oldStock * p.cost_cents + v) / (oldStock + q));
  }

  const [r] = await sql`INSERT INTO receipts (number, doc_date, supplier, doc_ref, note, total_cents)
    VALUES (${number}, ${date}, ${String(b.supplier || "").trim().slice(0, 120)}, ${String(b.doc_ref || "").trim().slice(0, 80) || null},
      ${String(b.note || "").trim().slice(0, 300) || null}, ${total}) RETURNING id`;
  await sql`INSERT INTO receipt_items (receipt_id, sku, code, name, size, qty, cost_cents)
    SELECT ${r.id}::bigint, * FROM unnest(${lines.map((l) => l.sku)}::text[], ${lines.map((l) => vmap[l.sku].code)}::text[],
      ${lines.map((l) => vmap[l.sku].name)}::text[], ${lines.map((l) => vmap[l.sku].size)}::text[],
      ${lines.map((l) => l.qty)}::int[], ${lines.map((l) => l.cost)}::int[])`;
  await sql`UPDATE variants v SET stock = v.stock + t.q FROM unnest(${lines.map((l) => l.sku)}::text[], ${lines.map((l) => l.qty)}::int[]) AS t(s, q)
    WHERE v.sku = t.s`;
  await sql`INSERT INTO stock_moves (sku, delta, reason, note)
    SELECT s, q, 'prejem', ${`Prevzem ${number}`} FROM unnest(${lines.map((l) => l.sku)}::text[], ${lines.map((l) => l.qty)}::int[]) AS t(s, q)`;
  await sql`UPDATE products p SET cost_cents = t.c FROM unnest(${Object.keys(newCost)}::text[], ${Object.values(newCost)}::int[]) AS t(code, c)
    WHERE p.code = t.code`;
  return NextResponse.json({ ok: true, number, pieces: lines.reduce((a, l) => a + l.qty, 0), total_cents: total,
    message: `Prevzem ${number} shranjen: ${lines.reduce((a, l) => a + l.qty, 0)} kosov, nabavna vrednost ${(total / 100).toFixed(2).replace(".", ",")} €.` });
}
