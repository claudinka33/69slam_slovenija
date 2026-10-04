import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, orders: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const orders = await sql`SELECT id, number, status, payment, name, email, phone, address, zip, city,
      lang, subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at, source, tracking, paid_at, coupon_code, discount_cents
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
  let invoiceNo = null;
  if (status === "poslano" && prev.status !== "poslano" && prev.source !== "shopify") {
    // račun se izda ob pošiljanju in gre kupcu kot priloga maila »paket je na poti«
    let att = null;
    try {
      const { invoiceFromOrder, invoicePdf } = await import("../../../../lib/invoices");
      const inv = await invoiceFromOrder(id);
      if (inv) {
        att = [{ filename: `racun-${inv.number}.pdf`, content: (await invoicePdf(inv)).toString("base64") }];
        invoiceNo = inv.number;
      }
    } catch (e) { console.error("[račun]", e); }
    try {
      const { sendShipped, mailConfigured } = await import("../../../../lib/mail");
      if (mailConfigured()) {
        const r = await sendShipped(id, att);
        mailed = true;
        if (att && invoiceNo && !r?.error) await sql`UPDATE invoices SET sent_at = now(), sent_to = (SELECT email FROM orders WHERE id = ${id}) WHERE number = ${invoiceNo}`;
      }
    } catch (e) { console.error(e); }
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
  return NextResponse.json({ ok: true, mailed, invoice: invoiceNo });
}
