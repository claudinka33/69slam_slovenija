import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, orders: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const orders = await sql`SELECT id, number, status, payment, name, email, phone, address, zip, city,
      lang, subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at
    FROM orders ORDER BY id DESC LIMIT 200`;
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
  const { id, status } = await req.json().catch(() => ({}));
  const allowed = ["novo", "placano", "poslano", "zakljuceno", "preklicano"];
  if (!id || !allowed.includes(status))
    return NextResponse.json({ ok: false, message: "Neveljaven status." }, { status: 400 });
  const sql = db();
  const [prev] = await sql`SELECT status FROM orders WHERE id = ${id}`;
  if (!prev) return NextResponse.json({ ok: false, message: "Naročilo ne obstaja." }, { status: 404 });

  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;

  if (status === "preklicano" && prev.status !== "preklicano") {
    const items = await sql`SELECT sku, qty FROM order_items WHERE order_id = ${id}`;
    for (const it of items) {
      await sql`UPDATE variants SET stock = stock + ${it.qty} WHERE sku = ${it.sku}`;
      await sql`INSERT INTO stock_moves (sku, delta, reason, note)
        VALUES (${it.sku}, ${it.qty}, 'preklic', ${"Preklic naročila (id " + id + ")"})`;
    }
  }
  return NextResponse.json({ ok: true });
}
