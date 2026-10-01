import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Podrobnosti stranke: kontakt, naslov, Shopify podatki in vsa naročila s postavkami. ?email= */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, nodb: true });
  const email = String(new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, message: "Manjka e-mail." }, { status: 400 });
  const sql = db();
  await ensureSchema();
  const [shop] = await sql`SELECT * FROM shop_customers WHERE email = ${email}`;
  const orders = await sql`SELECT id, number, status, payment, name, phone, address, zip, city, country,
      subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at, source
    FROM orders WHERE lower(email) = ${email} ORDER BY created_at DESC`;
  const items = orders.length ? await sql`SELECT order_id, sku, name, size, qty, price_cents
    FROM order_items WHERE order_id = ANY(${orders.map((o) => o.id)})` : [];
  const by = {};
  for (const it of items) (by[it.order_id] = by[it.order_id] || []).push(it);
  const [sub] = await sql`SELECT created_at FROM subscribers WHERE lower(email) = ${email}`;
  return NextResponse.json({
    ok: true,
    email,
    shop: shop || null,
    subscribed: !!sub,
    orders: orders.map((o) => ({ ...o, id: Number(o.id), number: Number(o.number), items: by[o.id] || [] })),
  });
}
