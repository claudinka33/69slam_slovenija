import crypto from "crypto";
import { db } from "./db";

/**
 * GA4 Measurement Protocol — strežniški dogodek »purchase« za VSAKO naročilo.
 * Pošlje se brez osebnih podatkov kupca (naključen anonimen client_id, brez e-maila,
 * imena, IP-ja ali piškotka). transaction_id = številka naročila (enako kot v brskalniku),
 * zato GA4 nakup kupca, ki je sprejel piškotke, šteje samo enkrat.
 * Deluje samo, če je v Vercelu nastavljen GA4_API_SECRET.
 */

const MEASUREMENT_ID = (process.env.NEXT_PUBLIC_GA4_ID || "G-RGW460V30K").split(",")[0].trim();
const ENDPOINT = "https://region1.google-analytics.com/mp/collect";

export async function sendGaPurchase(orderId) {
  const secret = process.env.GA4_API_SECRET;
  if (!secret || !orderId) return { skipped: "no-secret" };
  try {
    const sql = db();
    const [o] = await sql`SELECT id, number, total_cents FROM orders WHERE id = ${orderId}`;
    if (!o) return { skipped: "no-order" };
    const items = await sql`SELECT sku, name, size, qty, price_cents FROM order_items WHERE order_id = ${orderId}`;
    const codeOf = (sku) => String(sku).replace(/-[^-]+$/, "");

    const clientId = `${crypto.randomInt(1e9, 2e9)}.${Math.floor(Date.now() / 1000)}`;
    const body = {
      client_id: clientId,
      non_personalized_ads: true,
      consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: String(o.number),
            currency: "EUR",
            value: Math.round(o.total_cents) / 100,
            engagement_time_msec: 1,
            items: items.map((i) => ({
              item_id: codeOf(i.sku),
              item_name: i.name,
              item_variant: i.size,
              price: i.price_cents / 100,
              quantity: i.qty,
            })),
          },
        },
      ],
    };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(
      `${ENDPOINT}?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}&api_secret=${encodeURIComponent(secret)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal }
    ).finally(() => clearTimeout(timer));
    if (!r.ok) console.error("[ga-mp] napaka", r.status);
    return { ok: r.ok };
  } catch (e) {
    console.error("[ga-mp] izjema", e?.message);
    return { ok: false };
  }
}
