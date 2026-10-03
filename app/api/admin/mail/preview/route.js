import { NextResponse } from "next/server";
import { primeCatalog, getProducts } from "../../../../../lib/catalog";
import { renderOrderConfirmation, renderShipped } from "../../../../../lib/mail";
import { renderReview, renderCart, getSettings, DEFAULTS } from "../../../../../lib/marketing";
import { dbConfigured } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Predogled samodejnih mailov z vzorčnimi podatki (nič se ne pošlje). ?kind=confirm|upn|cod|shipped|review|cart1|cart2&lang=sl|en */
export async function GET(req) {
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") || "confirm";
  const lang = u.searchParams.get("lang") === "en" ? "en" : "sl";
  await primeCatalog();
  const ps = getProducts().filter((p) => p.img && p.group === "boksarice").slice(0, 3);
  const s = dbConfigured() ? await getSettings().catch(() => DEFAULTS) : DEFAULTS;
  const items = ps.slice(0, 2).map((p, i) => ({ name: p.name, size: i ? "L" : "M", qty: 1, price_cents: Math.round(p.effPrice * 100), img: p.img, slug: p.slug }));
  const sub = items.reduce((a, x) => a + x.price_cents, 0);
  const pay = kind === "upn" ? "proforma" : kind === "cod" ? "cod" : "card";
  const cod = pay === "cod" ? 150 : 0;
  const ship = sub >= 5000 ? 0 : 500;
  const o = { id: 1, number: 1234, lang, name: "Marko Novak", email: "marko@primer.si", phone: "041 123 456", address: "Slovenska cesta 1", zip: "1000", city: "Ljubljana",
    payment: pay, items, subtotal_cents: sub, shipping_cents: ship, cod_fee_cents: cod, total_cents: sub + ship + cod, discount_cents: 0, tracking: "PS123456789SI" };
  let html;
  if (kind === "shipped") html = renderShipped(o).html;
  else if (kind === "review") html = renderReview(o, ps.slice(0, 2), s).html;
  else if (kind === "cart1" || kind === "cart2") {
    const c = { token: "0".repeat(24), email: o.email, lang, cart: ps.map((p, i) => ({ id: p.code, size: ["M", "L", "XL"][i], qty: 1 })) };
    html = renderCart(kind, c, s, kind === "cart2" && s.cart_discount2 ? "KOSARICA-A1B2C3" : null).html;
  } else {
    const r = await renderOrderConfirmation(o);
    html = r.html;
    // QR v predogledu kot vdelana slika
    const qr = r.attachments.find((a) => a.contentId === "upnqr");
    if (qr) html = html.replace("cid:upnqr", `data:image/png;base64,${qr.content}`);
  }
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
