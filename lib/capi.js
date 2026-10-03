import crypto from "crypto";
import { db } from "./db";

/**
 * Meta Conversions API — strežniški dogodek »Purchase«.
 * Pošlje se samo, če je kupec v obvestilu o piškotkih dal oglaševalsko privolitev
 * in je v Vercelu nastavljen META_CAPI_TOKEN. event_id = "order-<številka>"
 * (enak kot v brskalniku), zato Meta nakup šteje samo enkrat.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1157011362114344";
const API = "https://graph.facebook.com/v21.0";

const norm = (v) => String(v || "").trim().toLowerCase();
const sha = (v) => (v ? crypto.createHash("sha256").update(v).digest("hex") : undefined);
const arr = (v) => (v ? [v] : undefined);

/** Slovenska telefonska v mednarodno obliko brez +: 040 123 456 → 38640123456 */
function phoneE164(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "386" + d.slice(1);
  return d;
}

/** Iz zahteve: IP in brskalnik kupca (za ujemanje v Meti). */
export function requestMeta(req, ad) {
  if (!ad || !ad.consent) return null;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : undefined);
  return {
    consent: true,
    fbp: clip(ad.fbp, 200),
    fbc: clip(ad.fbc, 300),
    url: clip(ad.url, 500),
    ip: clip(ip, 64),
    ua: clip(req.headers.get("user-agent") || "", 400),
  };
}

export async function sendPurchase(orderId) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !orderId) return { skipped: "no-token" };
  try {
    const sql = db();
    const [o] = await sql`SELECT id, number, name, email, phone, zip, city, country, total_cents, ad_meta
      FROM orders WHERE id = ${orderId}`;
    if (!o) return { skipped: "no-order" };
    let m = null;
    try { m = o.ad_meta ? JSON.parse(o.ad_meta) : null; } catch {}
    if (!m?.consent) return { skipped: "no-consent" };
    const items = await sql`SELECT sku, qty, price_cents FROM order_items WHERE order_id = ${orderId}`;
    const codeOf = (sku) => String(sku).replace(/-[^-]+$/, "");
    const [fn, ...rest] = String(o.name || "").trim().split(/\s+/);
    const ln = rest.join(" ");

    const event = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: `order-${o.number}`,
      action_source: "website",
      event_source_url: m.url,
      user_data: {
        em: arr(sha(norm(o.email))),
        ph: arr(sha(phoneE164(o.phone))),
        fn: arr(sha(norm(fn))),
        ln: arr(sha(norm(ln))),
        ct: arr(sha(norm(o.city).replace(/\s+/g, ""))),
        zp: arr(sha(norm(o.zip).replace(/\s+/g, ""))),
        country: arr(sha(norm(o.country || "si"))),
        external_id: arr(sha(norm(o.email))),
        client_ip_address: m.ip || undefined,
        client_user_agent: m.ua || undefined,
        fbp: m.fbp || undefined,
        fbc: m.fbc || undefined,
      },
      custom_data: {
        currency: "EUR",
        value: Math.round(o.total_cents) / 100,
        order_id: String(o.number),
        content_type: "product",
        content_ids: [...new Set(items.map((i) => codeOf(i.sku)))],
        contents: items.map((i) => ({ id: codeOf(i.sku), quantity: i.qty, item_price: i.price_cents / 100 })),
        num_items: items.reduce((a, i) => a + i.qty, 0),
      },
    };
    const body = { data: [event] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(`${API}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const out = await r.json().catch(() => ({}));
    if (!r.ok) console.error("[capi] napaka", r.status, JSON.stringify(out).slice(0, 300));
    return { ok: r.ok, out };
  } catch (e) {
    console.error("[capi] izjema", e?.message);
    return { ok: false };
  }
}
