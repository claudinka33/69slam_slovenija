import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../lib/db";
import { getProducts, skuOf, primeCatalog } from "../../../lib/catalog";
import { stripe } from "../../../lib/payments";
import { requestMeta, sendPurchase } from "../../../lib/capi";
import { country as countryOf, shipFor, COD_FEE as COD_EUR } from "../../../lib/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNDLE_OFF = 0.15;
const COD_FEE = Math.round(COD_EUR * 100);

const MSG = {
  sl: {
    empty: "Košarica je prazna.",
    invalid: "Manjkajo podatki za dostavo.",
    nostock: (n) => `Žal je med naročanjem zmanjkalo zaloge za: ${n}. Osveži stran in poskusi znova.`,
    nodb: "Trgovina še ni povezana z bazo — poskusi kasneje.",
    ok: (num) => `Naročilo #${num} je sprejeto! Potrditev sledi na e-mail.`,
  },
  hr: {
    empty: "Košarica je prazna.",
    invalid: "Nedostaju podaci za dostavu.",
    nostock: (n) => `Nažalost je tijekom narudžbe nestalo zalihe za: ${n}. Osvježi stranicu i pokušaj ponovno.`,
    nodb: "Trgovina još nije povezana s bazom — pokušaj kasnije.",
    ok: (num) => `Narudžba #${num} je zaprimljena! Potvrda slijedi na e-mail.`,
  },
  en: {
    empty: "Your cart is empty.",
    invalid: "Delivery details are missing.",
    nostock: (n) => `Unfortunately we ran out of stock for: ${n}. Refresh the page and try again.`,
    nodb: "The store is not connected to the database yet — please try later.",
    ok: (num) => `Order #${num} received! A confirmation is on its way to your e-mail.`,
  },
};

export async function POST(req) {
  await primeCatalog();
  const body = await req.json().catch(() => null);
  const lang = body?.lang && MSG[body.lang] ? body.lang : "sl";
  const t = MSG[lang];

  if (!body || !Array.isArray(body.cart) || body.cart.length === 0)
    return NextResponse.json({ ok: false, message: t.empty }, { status: 400 });

  const c = body.customer || {};
  for (const f of ["name", "email", "address", "zip", "city"])
    if (!c[f] || String(c[f]).trim().length < 2)
      return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
  const cc = countryOf(c.country || (lang === "hr" ? "HR" : lang === "en" ? "" : "SI"));
  if (!cc) return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
  let payment = ["card", "proforma", "cod"].includes(body.payment) ? body.payment : "proforma";
  if (payment === "cod" && !cc.cod) payment = "card";

  if (!dbConfigured())
    return NextResponse.json({ ok: false, message: t.nodb }, { status: 503 });

  // ---- Preračun na strežniku (cen iz brskalnika NIKOLI ne verjamemo) ----
  // odprodaja zadnje velikosti se določi po živi zalogi v bazi
  const products = Object.fromEntries(getProducts({ withEmpty: true }).map((p) => [p.code, p]));
  if (dbConfigured()) {
    const codes = [...new Set(body.cart.flatMap((l) => (l.bundle ? (l.items || []).map((x) => x.id) : [l.id])).filter(Boolean))];
    const live = await db()`SELECT code, COUNT(*) FILTER (WHERE stock > 0)::int AS n FROM variants WHERE code = ANY(${codes}) GROUP BY code`;
    for (const r of live) {
      const p = products[r.code];
      if (!p || p.outlet || (p.group !== "boksarice" && p.group !== "kopalke")) continue;
      const sale = r.n === 1;
      products[r.code] = { ...p, sale, effPrice: sale ? +(p.price * 0.7).toFixed(2) : p.promo15 ? +(p.price * 0.85).toFixed(2) : p.price, bundleable: p.gender === "moski" && p.group === "boksarice" && !sale };
    }
  }
  const items = []; // {sku,name,size,qty,price_cents,bundle_key}
  let bundleIdx = 0;
  for (const line of body.cart) {
    if (line.bundle && Array.isArray(line.items) && line.items.length === 3) {
      bundleIdx++;
      const key = `P3-${Date.now()}-${bundleIdx}`;
      const each = line.items.map((x) => {
        const p = products[x.id];
        if (!p || !p.bundleable || !x.size) return null; // paket = samo redne moške boksarice
        return { code: x.id, sku: skuOf(x.id, x.size), name: p.name, size: x.size, qty: 1,
                 price_cents: Math.round((p.price * (1 - BUNDLE_OFF)) * 100), bundle_key: key, base_cents: Math.round(p.price * 100) };
      });
      if (each.some((x) => !x))
        return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
      items.push(...each);
    } else if (line.id && line.size && line.qty > 0 && line.qty <= 20) {
      const p = products[line.id];
      if (!p) return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
      const eff = p.effPrice; // odprodaja −30 % / VSE MORE VEN −50 % je že upoštevana
      items.push({ code: line.id, sku: skuOf(line.id, line.size), name: p.name, size: line.size,
                   qty: line.qty, price_cents: Math.round(eff * 100), bundle_key: null, base_cents: Math.round(p.price * 100) });
    }
  }
  if (items.length === 0)
    return NextResponse.json({ ok: false, message: t.empty }, { status: 400 });

  // ---- Koda za popust: velja boljši popust (koda ALI paket/odprodaja), nikoli oba ----
  let couponCode = null;
  let discount = 0;
  if (body.coupon) {
    const { checkCoupon, bestUnit } = await import("../../../lib/coupon");
    const before = items.reduce((a, x) => a + x.price_cents * x.qty, 0);
    const chk = await checkCoupon(db(), body.coupon, c.email, before, lang);
    if (!chk.ok) return NextResponse.json({ ok: false, message: chk.message }, { status: 400 });
    for (const it of items) {
      const np = bestUnit(it.price_cents, it.base_cents, chk.coupon.percent);
      discount += (it.price_cents - np) * it.qty;
      it.price_cents = np;
    }
    if (discount > 0) couponCode = chk.coupon.code;
    else discount = 0;
  }

  const subtotal = items.reduce((a, x) => a + x.price_cents * x.qty, 0);
  const shipping = Math.round((shipFor(cc.code, subtotal / 100) || 0) * 100);
  const codFee = payment === "cod" ? COD_FEE : 0;
  const total = subtotal + shipping + codFee;

  const sql = db();
  await ensureSchema();

  // ---- Odštej zalogo (pogojno, varno ob sočasnih nakupih) ----
  const done = [];
  const failedNames = [];
  for (const it of items) {
    const r = await sql`UPDATE variants SET stock = stock - ${it.qty}
      WHERE sku = ${it.sku} AND stock >= ${it.qty} RETURNING sku`;
    if (r.length) done.push(it);
    else failedNames.push(`${it.name} (${it.size})`);
  }
  if (failedNames.length) {
    // vrni že odšteto
    for (const it of done)
      await sql`UPDATE variants SET stock = stock + ${it.qty} WHERE sku = ${it.sku}`;
    return NextResponse.json({ ok: false, message: t.nostock(failedNames.join(", ")) }, { status: 409 });
  }

  // ---- Zapiši naročilo ----
  // prišel iz maila kampanje (piškotek c69 ob kliku, velja 7 dni)
  const c69 = String(req.cookies?.get?.("c69")?.value || "").split(".");
  const campaignId = c69[0] && Date.now() - Number(c69[1] || 0) < 7 * 864e5 ? Number(c69[0]) || null : null;
  const [order] = await sql`INSERT INTO orders
    (status, payment, name, email, phone, address, zip, city, country, lang,
     subtotal_cents, shipping_cents, cod_fee_cents, total_cents, coupon_code, discount_cents, campaign_id)
    VALUES ('novo', ${payment}, ${c.name}, ${c.email}, ${c.phone || null}, ${c.address},
            ${c.zip}, ${c.city}, ${cc.code}, ${lang}, ${subtotal}, ${shipping}, ${codFee}, ${total}, ${couponCode}, ${discount}, ${campaignId})
    RETURNING id, number`;

  // podatki za merjenje oglasov (samo ob oglaševalski privolitvi v obvestilu o piškotkih)
  const adMeta = requestMeta(req, body.ad);
  if (adMeta) {
    try { await sql`UPDATE orders SET ad_meta = ${JSON.stringify(adMeta)} WHERE id = ${order.id}`; } catch {}
  }
  const trackData = {
    value: total / 100,
    items: items.map((it) => ({ id: it.code, name: it.name, size: it.size, qty: it.qty, price: it.price_cents / 100 })),
  };

  for (const it of items) {
    await sql`INSERT INTO order_items (order_id, sku, name, size, qty, price_cents, bundle_key, cost_cents)
      VALUES (${order.id}, ${it.sku}, ${it.name}, ${it.size}, ${it.qty}, ${it.price_cents}, ${it.bundle_key},
        (SELECT p.cost_cents FROM variants v JOIN products p ON p.code = v.code WHERE v.sku = ${it.sku}))`;
    await sql`INSERT INTO stock_moves (sku, delta, reason, note)
      VALUES (${it.sku}, ${-it.qty}, 'narocilo', ${"Naročilo #" + order.number})`;
  }

  // ---- Kupec postane naročnik na novice (odjava kadarkoli; kdor se je odjavil, ostane odjavljen) ----
  try {
    await sql`INSERT INTO subscribers (email, lang, source, name) VALUES (${String(c.email).trim().toLowerCase()}, ${lang}, 'kupec', ${c.name})
      ON CONFLICT (email) DO NOTHING`;
  } catch {}

  // ---- Plačilo s kartico: Stripe Checkout ----
  if (payment === "card" && stripe()) {
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const line_items = items.map((it) => ({
      quantity: it.qty,
      price_data: { currency: "eur", unit_amount: it.price_cents,
        product_data: { name: `${it.name} (${it.size})${it.bundle_key ? " · Paket 3" : ""}` } },
    }));
    if (shipping > 0)
      line_items.push({ quantity: 1, price_data: { currency: "eur", unit_amount: shipping, product_data: { name: lang === "en" ? "Shipping" : lang === "hr" ? "Poštarina" : "Poštnina" } } });
    try {
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        line_items,
        customer_email: c.email,
        locale: lang === "en" ? "en" : lang === "hr" ? "hr" : "sl",
        client_reference_id: String(order.id),
        metadata: { order_id: String(order.id), order_number: String(order.number) },
        payment_intent_data: { description: `69SLAM naročilo #${order.number}`, metadata: { order_id: String(order.id) } },
        expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
        success_url: `${origin}/${lang}/blagajna/hvala?o=${order.number}&s={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/${lang}/blagajna/hvala?o=${order.number}&preklic=1`,
      });
      await sql`UPDATE orders SET payment_ref = ${session.id} WHERE id = ${order.id}`;
      return NextResponse.json({ ok: true, number: Number(order.number), redirect: session.url });
    } catch (e) {
      // plačila ni bilo mogoče začeti → naročilo prekliči in vrni zalogo
      const { cancelUnpaid } = await import("../../../lib/payments");
      await cancelUnpaid(order.id, "Napaka pri začetku plačila");
      return NextResponse.json({ ok: false, message: lang === "en" ? "Card payment could not be started. Please try again or choose another method." : lang === "hr" ? "Plaćanje karticom nije bilo moguće pokrenuti. Pokušaj ponovno ili odaberi drugi način plaćanja." : "Plačila s kartico ni bilo mogoče začeti. Poskusi znova ali izberi drug način plačila." }, { status: 502 });
    }
  }

  // ---- E-maili (kartica: šele ko je plačano) ----
  if (payment !== "card" || !stripe()) {
    const { mailNewOrder } = await import("../../../lib/payments");
    await mailNewOrder(order.id);
    await sendPurchase(order.id);
  }

  // ---- Predračun: UPN QR za mobilno banko ----
  if (payment === "proforma") {
    try {
      const { upnSvg } = await import("../../../lib/upn");
      const { COMPANY } = await import("../../../lib/legal");
      const upn = await upnSvg({ amountCents: total, number: order.number, name: c.name, street: c.address, city: `${c.zip} ${c.city}` });
      return NextResponse.json({ ok: true, number: Number(order.number), message: t.ok(order.number), track: trackData,
        upn: { svg: upn.svg, ref: upn.ref, due: upn.due, amount: total, iban: COMPANY.iban, bank: COMPANY.bank, bic: COMPANY.bic, payee: COMPANY.short, address: COMPANY.address } });
    } catch { /* brez QR — podatki gredo po e-mailu */ }
  }

  return NextResponse.json({ ok: true, number: Number(order.number), message: t.ok(order.number), track: trackData });
}
