import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * Uvoz Shopify izvoza (CSV), ki ga admin prebere v brskalniku in pošlje po delih.
 *  { kind: "customers", rows: [{ email, name, phone, city, orders, spent, marketing }] }
 *  { kind: "orders",    rows: [{ ext, number, email, name, phone, address, zip, city, country,
 *                                created_at, cancelled, subtotal, shipping, total, items: [{ sku, name, size, qty, price }] }] }
 * Uvožena naročila imajo source = 'shopify' in NIKOLI ne spreminjajo zaloge. Ponoven uvoz ne podvaja.
 */
const c = (n) => Math.round((Number(n) || 0) * 100);
const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);

export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const { kind, rows } = await req.json().catch(() => ({}));
  if (!Array.isArray(rows) || !rows.length || rows.length > 2000)
    return NextResponse.json({ ok: false, message: "Ni podatkov za uvoz." }, { status: 400 });
  const sql = db();
  await ensureSchema();

  if (kind === "customers") {
    const R = rows
      .map((r) => ({ email: str(r.email).toLowerCase(), name: str(r.name), phone: str(r.phone, 40), city: str(r.city, 80),
        address: str(r.address), zip: str(r.zip, 20), country: str(r.country, 4),
        orders: Math.max(0, parseInt(r.orders, 10) || 0), spent: Math.max(0, c(r.spent)), mk: !!r.marketing }))
      .filter((r) => r.email.includes("@"));
    const uniq = [...new Map(R.map((r) => [r.email, r])).values()];
    if (!uniq.length) return NextResponse.json({ ok: true, customers: 0, subscribers: 0 });
    await sql`INSERT INTO shop_customers (email, name, phone, city, orders_count, total_cents, accepts_marketing, address, zip, country)
      SELECT * FROM unnest(${uniq.map((r) => r.email)}::text[], ${uniq.map((r) => r.name)}::text[],
        ${uniq.map((r) => r.phone)}::text[], ${uniq.map((r) => r.city)}::text[], ${uniq.map((r) => r.orders)}::int[],
        ${uniq.map((r) => r.spent)}::int[], ${uniq.map((r) => r.mk)}::boolean[], ${uniq.map((r) => r.address)}::text[],
        ${uniq.map((r) => r.zip)}::text[], ${uniq.map((r) => r.country)}::text[])
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, city = EXCLUDED.city,
        address = EXCLUDED.address, zip = EXCLUDED.zip, country = EXCLUDED.country,
        orders_count = EXCLUDED.orders_count, total_cents = EXCLUDED.total_cents,
        accepts_marketing = EXCLUDED.accepts_marketing, imported_at = now()`;
    const subs = uniq.filter((r) => r.mk).map((r) => r.email);
    const s = subs.length ? await sql`INSERT INTO subscribers (email, lang)
      SELECT e, 'sl' FROM unnest(${subs}::text[]) AS t(e) ON CONFLICT (email) DO NOTHING RETURNING id` : [];
    return NextResponse.json({ ok: true, customers: uniq.length, subscribers: s.length });
  }

  if (kind === "orders") {
    let imported = 0, skipped = 0;
    for (const o of rows) {
      const email = str(o.email).toLowerCase();
      const ext = str(o.ext, 120);
      if (!ext || !email.includes("@")) { skipped++; continue; }
      const created = new Date(o.created_at);
      const ins = await sql`INSERT INTO orders (number, status, payment, name, email, phone, address, zip, city, country,
          lang, subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at, source, external_id)
        VALUES (${parseInt(o.number, 10) || 0}, ${o.cancelled ? "preklicano" : "zakljuceno"}, 'shopify',
          ${str(o.name) || email}, ${email}, ${str(o.phone, 40) || null}, ${str(o.address) || "-"},
          ${str(o.zip, 20) || "-"}, ${str(o.city, 80) || "-"}, ${str(o.country, 4) || "SI"}, 'sl',
          ${c(o.subtotal)}, ${c(o.shipping)}, 0, ${c(o.total)},
          ${isNaN(created) ? new Date().toISOString() : created.toISOString()}, 'shopify', ${ext})
        ON CONFLICT (external_id) DO NOTHING RETURNING id`;
      if (!ins.length) { skipped++; continue; }
      imported++;
      const items = (Array.isArray(o.items) ? o.items : []).filter((i) => (parseInt(i.qty, 10) || 0) > 0).slice(0, 60);
      if (items.length)
        await sql`INSERT INTO order_items (order_id, sku, name, size, qty, price_cents)
          SELECT ${ins[0].id}::bigint, * FROM unnest(
            ${items.map((i) => str(i.sku, 60) || "-")}::text[], ${items.map((i) => str(i.name, 200) || "-")}::text[],
            ${items.map((i) => str(i.size, 20) || "-")}::text[], ${items.map((i) => parseInt(i.qty, 10))}::int[],
            ${items.map((i) => c(i.price))}::int[])`;
    }
    return NextResponse.json({ ok: true, imported, skipped });
  }

  return NextResponse.json({ ok: false, message: "Neznana vrsta uvoza." }, { status: 400 });
}
