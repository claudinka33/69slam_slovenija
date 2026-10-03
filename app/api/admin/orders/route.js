import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, orders: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const orders = await sql`SELECT id, number, status, payment, name, email, phone, address, zip, city,
      lang, subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at, source, tracking, paid_at
    FROM orders ORDER BY created_at DESC, id DESC LIMIT 2000`;
  const items = await sql`SELECT order_id, sku, name, size, qty, price_cents, bundle_key
    FROM order_items WHERE order_id = ANY(${orders.map((o) => o.id)})`;
  const byOrder = {};
  for (const it of items) (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);
  return NextResponse.json({
    ok: true,
    orders: orders.map((o) => ({ ...o, id: Number(o.id), number: Number(o.number), items: byOrder[o.id] || [] })),
  });
}

/** Sprememba statusa naročila. Ob preklicu se zaloga vrne. */
export async function PATCH(req) {
  const { id, status, tracking } = await req.json().catch(() => ({}));
  const allowed = ["novo", "placano", "poslano", "zakljuceno", "preklicano"];
  if (!id || !allowed.includes(status))
    return NextResponse.json({ ok: false, message: "Neveljaven status." }, { status: 400 });
  const sql = db();
  const [prev] = await sql`SELECT status, source FROM orders WHERE id = ${id}`;
  if (!prev) return NextResponse.json({ ok: false, message: "Naročilo ne obstaja." }, { status: 404 });

  await sql`UPDATE orders SET status = ${status},
      tracking = COALESCE(${tracking ? String(tracking).trim().slice(0, 60) : null}, tracking),
      paid_at = CASE WHEN ${status} = 'placano' THEN COALESCE(paid_at, now()) ELSE paid_at END
    WHERE id = ${id}`;
  // kupcu: »paket je na poti« (ne za uvožena Shopify naročila)
  let mailed = false;
  if (status === "poslano" && prev.status !== "poslano" && prev.source !== "shopify") {
    try { const { sendShipped, mailConfigured } = await import("../../../../lib/mail"); if (mailConfigured()) { await sendShipped(id); mailed = true; } } catch (e) { console.error(e); }
  }

  // uvožena Shopify naročila ne vplivajo na zalogo
  if (status === "preklicano" && prev.status !== "preklicano" && prev.source !== "shopify") {
    const items = await sql`SELECT sku, qty FROM order_items WHERE order_id = ${id}`;
    for (const it of items) {
      await sql`UPDATE variants SET stock = stock + ${it.qty} WHERE sku = ${it.sku}`;
      await sql`INSERT INTO stock_moves (sku, delta, reason, note)
        VALUES (${it.sku}, ${it.qty}, 'preklic', ${"Preklic naročila (id " + id + ")"})`;
    }
  }
  return NextResponse.json({ ok: true, mailed });
}
