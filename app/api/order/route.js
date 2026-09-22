import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../lib/db";
import { getProducts } from "../../../lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUNDLE_OFF = 0.15;
const SALE_OFF = 0.5;
const FREE_FROM = 5000; // v centih
const SHIP = 350;
const COD_FEE = 150;

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
  const body = await req.json().catch(() => null);
  const lang = body?.lang && MSG[body.lang] ? body.lang : "sl";
  const t = MSG[lang];

  if (!body || !Array.isArray(body.cart) || body.cart.length === 0)
    return NextResponse.json({ ok: false, message: t.empty }, { status: 400 });

  const c = body.customer || {};
  for (const f of ["name", "email", "address", "zip", "city"])
    if (!c[f] || String(c[f]).trim().length < 2)
      return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
  const payment = ["card", "proforma", "cod"].includes(body.payment) ? body.payment : "proforma";

  if (!dbConfigured())
    return NextResponse.json({ ok: false, message: t.nodb }, { status: 503 });

  // ---- Preračun na strežniku (cen iz brskalnika NIKOLI ne verjamemo) ----
  const products = Object.fromEntries(getProducts().map((p) => [p.code, p]));
  const items = []; // {sku,name,size,qty,price_cents,bundle_key}
  let bundleIdx = 0;
  for (const line of body.cart) {
    if (line.bundle && Array.isArray(line.items) && line.items.length === 3) {
      bundleIdx++;
      const key = `P3-${Date.now()}-${bundleIdx}`;
      const each = line.items.map((x) => {
        const p = products[x.id];
        if (!p || p.sale) return null; // odprodaja ne sme v paket
        return { sku: `${x.id}-${x.size}`, name: p.name, size: x.size, qty: 1,
                 price_cents: Math.round((p.price * (1 - BUNDLE_OFF)) * 100), bundle_key: key };
      });
      if (each.some((x) => !x))
        return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
      items.push(...each);
    } else if (line.id && line.size && line.qty > 0 && line.qty <= 20) {
      const p = products[line.id];
      if (!p) return NextResponse.json({ ok: false, message: t.invalid }, { status: 400 });
      const eff = p.sale ? p.price * (1 - SALE_OFF) : p.price;
      items.push({ sku: `${line.id}-${line.size}`, name: p.name, size: line.size,
                   qty: line.qty, price_cents: Math.round(eff * 100), bundle_key: null });
    }
  }
  if (items.length === 0)
    return NextResponse.json({ ok: false, message: t.empty }, { status: 400 });

  const subtotal = items.reduce((a, x) => a + x.price_cents * x.qty, 0);
  const shipping = subtotal >= FREE_FROM ? 0 : SHIP;
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
  const [order] = await sql`INSERT INTO orders
    (status, payment, name, email, phone, address, zip, city, country, lang,
     subtotal_cents, shipping_cents, cod_fee_cents, total_cents)
    VALUES ('novo', ${payment}, ${c.name}, ${c.email}, ${c.phone || null}, ${c.address},
            ${c.zip}, ${c.city}, 'SI', ${lang}, ${subtotal}, ${shipping}, ${codFee}, ${total})
    RETURNING id, number`;

  for (const it of items) {
    await sql`INSERT INTO order_items (order_id, sku, name, size, qty, price_cents, bundle_key)
      VALUES (${order.id}, ${it.sku}, ${it.name}, ${it.size}, ${it.qty}, ${it.price_cents}, ${it.bundle_key})`;
    await sql`INSERT INTO stock_moves (sku, delta, reason, note)
      VALUES (${it.sku}, ${-it.qty}, 'narocilo', ${"Naročilo #" + order.number})`;
  }

  return NextResponse.json({ ok: true, number: Number(order.number), message: t.ok(order.number) });
}
