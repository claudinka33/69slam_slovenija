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
  // slike artiklov (prva slika iz kataloga)
  const imgs = {};
  try {
    const { primeCatalog, getAnyProduct } = await import("../../../../lib/catalog");
    await primeCatalog();
    for (const it of items) {
      const code = String(it.sku || "").replace(/-[^-]+$/, "");
      if (!(code in imgs)) { try { imgs[code] = getAnyProduct(code)?.img || null; } catch { imgs[code] = null; } }
      it.img = imgs[code];
    }
  } catch (e) { console.error("[slike naročil]", e); }
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

  // preklic: neizkoriščeni dokumenti naročila (dobavnica, predračun) se prekličejo
  if (status === "preklicano" && prev.status !== "preklicano")
    await sql`UPDATE invoices SET status = 'preklican' WHERE order_id = ${id} AND kind IN ('dobavnica','predracun') AND converted_to IS NULL`;
  if (tracking) await sql`UPDATE invoices SET tracking = ${String(tracking).trim().slice(0, 60)} WHERE order_id = ${id} AND kind = 'dobavnica'`;

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

/**
 * Izbris TESTNEGA naročila: kot da se nikoli ni zgodilo — zaloga nazaj, brez sledi v zgodovini zaloge,
 * dobavnica/predračun, opomniki in ocene izbrisani. Ne gre, če je bil izdan račun (ta je že pri FURS).
 */
export async function DELETE(req) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, message: "Manjka naročilo." }, { status: 400 });
  const sql = db();
  await ensureSchema();
  const [o] = await sql`SELECT id, number, status, source FROM orders WHERE id = ${id}`;
  if (!o) return NextResponse.json({ ok: false, message: "Naročilo ne obstaja." }, { status: 404 });
  if (o.source === "shopify") return NextResponse.json({ ok: false, message: "Uvoženih Shopify naročil se ne briše." }, { status: 400 });
  const [inv] = await sql`SELECT number FROM invoices WHERE order_id = ${id} AND kind IN ('racun','dobropis') LIMIT 1`;
  if (inv) return NextResponse.json({ ok: false, message: `Za to naročilo je že izdan račun ${inv.number} (potrjen pri FURS), zato ga ni mogoče izbrisati. Uporabi Preklicano + dobropis.` }, { status: 400 });
  const items = await sql`SELECT sku, qty FROM order_items WHERE order_id = ${id}`;
  if (o.status !== "preklicano")
    for (const it of items) await sql`UPDATE variants SET stock = stock + ${it.qty} WHERE sku = ${it.sku}`;
  const skus = items.map((it) => it.sku);
  await sql`DELETE FROM stock_moves WHERE sku = ANY(${skus}) AND (note = ${"Naročilo #" + o.number} OR note = ${"Neplačano naročilo #" + o.number}
    OR note = ${"Preklic naročila (id " + id + ")"} OR note LIKE ${"%naročilo #" + o.number})`;
  await sql`DELETE FROM mail_jobs WHERE (kind = 'review' AND ref_id = ${id})
    OR (kind IN ('cart1','cart2') AND ref_id IN (SELECT c.id FROM carts c WHERE c.recovered_order = ${id}))`;
  await sql`DELETE FROM carts WHERE recovered_order = ${id}`;
  await sql`DELETE FROM reviews WHERE order_id = ${id}`;
  await sql`DELETE FROM invoices WHERE order_id = ${id} AND kind IN ('dobavnica','predracun')`;
  await sql`DELETE FROM orders WHERE id = ${id}`;
  return NextResponse.json({ ok: true, message: `Testno naročilo #${o.number} je izbrisano, zaloga je vrnjena.` });
}
