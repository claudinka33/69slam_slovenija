import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, orders: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const qp = new URL(req.url).searchParams;
  // maili kupcu za naročilo + stanje dostave (Resend)
  if (qp.get("mails") && qp.get("id")) {
    const id = qp.get("id");
    const { mailStatus } = await import("../../../../lib/mail");
    const rows = await sql`SELECT kind, email, subject, attachment, resend_id, error, at FROM mail_log WHERE order_id = ${id} ORDER BY at`;
    for (const r of rows) r.status = r.error ? "napaka" : await mailStatus(r.resend_id);
    const [o] = await sql`SELECT email, mailed_at FROM orders WHERE id = ${id}`;
    const inv = await sql`SELECT number, sent_at, sent_to FROM invoices WHERE order_id = ${id} AND kind = 'racun' AND sent_at IS NOT NULL`;
    return NextResponse.json({ ok: true, log: rows, legacy: { confirm_at: o?.mailed_at || null, invoices: inv } });
  }
  // diagnostika pred odprtjem: spletna naročila, števec, današnji premiki zaloge (?diag=1, ?diag=1&reset=1)
  if (qp.get("diag")) {
    if (qp.get("reset"))
      await sql`SELECT setval('order_number_seq', GREATEST(1000, COALESCE((SELECT MAX(number) FROM orders WHERE source IS DISTINCT FROM 'shopify'), 1000)))`;
    const web = await sql`SELECT id, number, status, created_at FROM orders WHERE source IS DISTINCT FROM 'shopify' ORDER BY id`;
    const [seq] = await sql`SELECT last_value, is_called FROM order_number_seq`;
    const moves = await sql`SELECT sku, delta, reason, note, created_at FROM stock_moves WHERE created_at > now() - interval '2 days' ORDER BY id`;
    const docs = await sql`SELECT number, kind, order_id FROM invoices WHERE issued_at > now() - interval '2 days' ORDER BY id`;
    const k = process.env.STRIPE_SECRET_KEY || "";
    const stripeInfo = { mode: k.startsWith("sk_live_") || k.startsWith("rk_live_") ? "live" : k ? "test" : "ni", webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET), site: process.env.SITE_URL || null };
    return NextResponse.json({ ok: true, web, seq, moves, docs, stripe: stripeInfo });
  }
  const orders = await sql`SELECT id, number, status, payment, name, email, phone, address, zip, city,
      lang, subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at, source, tracking, paid_at, coupon_code, discount_cents,
      country, posta_sent_at, posta_status, posta_checked_at, pickup, manual_pct, orig_shipping_cents
    FROM orders ORDER BY created_at DESC, id DESC LIMIT 2000`;
  const items = await sql`SELECT order_id, sku, name, size, qty, price_cents, bundle_key, orig_price_cents
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

/**
 * Popravek e-maila kupca in/ali ponovno pošiljanje maila.
 * { id, action: "email", email, resend?: true }  → popravi naslov povsod (naročilo, dokumenti, čakajoči maili) in pošlje potrditev znova
 * { id, action: "resend", kind: "potrditev" | "poslano" } → pošlje mail znova na trenutni naslov
 */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, message: "Manjka naročilo." }, { status: 400 });
  const sql = db();
  await ensureSchema();
  const [o] = await sql`SELECT id, email, status, source FROM orders WHERE id = ${id}`;
  if (!o) return NextResponse.json({ ok: false, message: "Naročilo ne obstaja." }, { status: 404 });
  const msgs = [];

  if (body.action === "discount") {
    const { applyManualDiscount } = await import("../../../../lib/orderDiscount");
    const r = await applyManualDiscount(id, body.percent, !!body.freeShip);
    if (!r.ok || !body.mail) return NextResponse.json(r);
    try {
      const { mailConfigured, sendOrderConfirmation } = await import("../../../../lib/mail");
      if (mailConfigured()) {
        const { docAttachment } = await import("../../../../lib/invoices");
        const [pre] = await sql`SELECT * FROM invoices WHERE order_id = ${id} AND kind = 'predracun' AND status = 'izdan' ORDER BY id LIMIT 1`;
        await sendOrderConfirmation(id, pre ? [await docAttachment(pre)] : [], { updated: true });
        const [cur] = await sql`SELECT email FROM orders WHERE id = ${id}`;
        r.message += ` ✉️ Popravljena potrditev poslana na ${cur.email}.`;
      }
    } catch (e) { console.error(e); r.message += " ⚠️ Maila ni bilo mogoče poslati."; }
    return NextResponse.json(r);
  }

  if (body.action === "email") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return NextResponse.json({ ok: false, message: "E-mail ni veljaven." }, { status: 400 });
    const old = String(o.email || "").toLowerCase();
    if (email !== old) {
      await sql`UPDATE orders SET email = ${email} WHERE id = ${id}`;
      await sql`UPDATE invoices SET customer_email = ${email} WHERE order_id = ${id}`;
      await sql`UPDATE mail_jobs SET email = ${email} WHERE status = 'cakajoce' AND (
        (kind = 'review' AND ref_id = ${id}) OR lower(email) = ${old})`;
      // seznam naročnikov: napačen naslov zamenjaj s pravim (če pravega še ni)
      if (old) {
        const [has] = await sql`SELECT 1 FROM subscribers WHERE lower(email) = ${email}`;
        if (has) await sql`DELETE FROM subscribers WHERE lower(email) = ${old}`;
        else await sql`UPDATE subscribers SET email = ${email} WHERE lower(email) = ${old}`;
      }
      msgs.push(`E-mail popravljen na ${email}.`);
    }
    if (!body.resend) return NextResponse.json({ ok: true, message: msgs.join(" ") || "E-mail je že pravilen." });
    body.kind = o.status === "poslano" || o.status === "zakljuceno" ? "poslano" : "potrditev";
  } else if (body.action !== "resend") {
    return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
  }

  if (o.source === "shopify") return NextResponse.json({ ok: false, message: "Za uvožena Shopify naročila se maili ne pošiljajo." }, { status: 400 });
  const { mailConfigured, sendOrderConfirmation, sendShipped } = await import("../../../../lib/mail");
  if (!mailConfigured()) return NextResponse.json({ ok: false, message: "Pošiljanje mailov ni nastavljeno." }, { status: 500 });
  const [cur] = await sql`SELECT email FROM orders WHERE id = ${id}`;
  const { docAttachment } = await import("../../../../lib/invoices");
  if (body.kind === "poslano") {
    const [inv] = await sql`SELECT * FROM invoices WHERE order_id = ${id} AND kind = 'racun' AND status <> 'storniran' ORDER BY id LIMIT 1`;
    const att = inv ? [await docAttachment(inv)] : undefined;
    const r = await sendShipped(id, att);
    if (r?.error) return NextResponse.json({ ok: false, message: "Pošiljanje ni uspelo: " + (r.error.message || r.error.name || "napaka") });
    if (inv) await sql`UPDATE invoices SET sent_at = now(), sent_to = ${cur.email} WHERE id = ${inv.id}`;
    msgs.push(`Mail »Paket je na poti«${inv ? " z računom" : ""} je poslan znova na ${cur.email}.`);
  } else {
    // potrditev (+ predračun, če gre za plačilo po predračunu)
    const [pre] = await sql`SELECT * FROM invoices WHERE order_id = ${id} AND kind = 'predracun' AND status = 'izdan' ORDER BY id LIMIT 1`;
    await sendOrderConfirmation(id, pre ? [await docAttachment(pre)] : []);
    msgs.push(`Potrditev naročila je poslana znova na ${cur.email}.`);
  }
  return NextResponse.json({ ok: true, message: msgs.join(" ") });
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

  let mailed = false;
  let invoiceNo = null;
  if (status === "poslano") {
    // račun + mail »paket je na poti« (skupna logika z avtomatiko Pošte)
    const { markShipped } = await import("../../../../lib/ship");
    ({ mailed, invoice: invoiceNo } = await markShipped(id, tracking));
  } else {
    await sql`UPDATE orders SET status = ${status},
        tracking = COALESCE(${tracking ? String(tracking).trim().slice(0, 60) : null}, tracking),
        paid_at = CASE WHEN ${status} = 'placano' THEN COALESCE(paid_at, now()) ELSE paid_at END
      WHERE id = ${id}`;
    if (tracking) await sql`UPDATE invoices SET tracking = ${String(tracking).trim().slice(0, 60)} WHERE order_id = ${id} AND kind = 'dobavnica'`;
  }

  // preklic: neizkoriščeni dokumenti naročila (dobavnica, predračun) se prekličejo
  if (status === "preklicano" && prev.status !== "preklicano")
    await sql`UPDATE invoices SET status = 'preklican' WHERE order_id = ${id} AND kind IN ('dobavnica','predracun') AND converted_to IS NULL`;

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
  // številčenje naročil nadaljuj za zadnjim pravim naročilom (prvo je #1001)
  await sql`SELECT setval('order_number_seq', GREATEST(1000, COALESCE((SELECT MAX(number) FROM orders WHERE source IS DISTINCT FROM 'shopify'), 1000)))`;
  return NextResponse.json({ ok: true, message: `Testno naročilo #${o.number} je izbrisano, zaloga je vrnjena.` });
}
