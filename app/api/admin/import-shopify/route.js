import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/*
 * Uvoz zgodovine naročil (in s tem strank) iz Shopifyja.
 * Potrebne Vercel spremenljivke:
 *   SHOPIFY_STORE_DOMAIN = npr. 69slam.myshopify.com
 *   + ENO od: SHOPIFY_ADMIN_TOKEN (shpat_...)  ALI  SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
 * Dovoljenja aplikacije: read_orders, read_all_orders, read_customers
 * Vsak klic uvozi eno stran (25 naročil) in vrne "cursor" za naslednjo — admin klice ponavlja sam.
 * Uvožena naročila NE spreminjajo zaloge. Ponoven uvoz ne podvaja (external_id).
 */

const API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

const QUERY = `query ImportOrders($after: String) {
  orders(first: 25, after: $after, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      name
      createdAt
      cancelledAt
      email
      phone
      customer {
        firstName
        lastName
        defaultEmailAddress { emailAddress marketingState }
      }
      shippingAddress { name address1 address2 zip city countryCodeV2 phone }
      subtotalPriceSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      totalPriceSet { shopMoney { amount } }
      lineItems(first: 30) {
        nodes {
          sku
          name
          variantTitle
          quantity
          originalUnitPriceSet { shopMoney { amount } }
        }
      }
    }
  }
}`;

const cents = (m) => Math.round(parseFloat(m?.shopMoney?.amount || "0") * 100);

async function getToken(shop) {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  const id = process.env.SHOPIFY_CLIENT_ID, secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.access_token) throw new Error(`Shopify prijava ni uspela (HTTP ${res.status}). Preveri Client ID / Secret.`);
  return out.access_token;
}

export async function POST(req) {
  if (!dbConfigured())
    return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const shop = (process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const { cursor } = await req.json().catch(() => ({}));

  try {
    const token = shop ? await getToken(shop) : null;
    if (!shop || !token)
      return NextResponse.json({ ok: false, setup: true,
        message: "Povezava s Shopifyjem še ni nastavljena (manjkajo Vercel spremenljivke SHOPIFY_STORE_DOMAIN in SHOPIFY_ADMIN_TOKEN)." });

    const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query: QUERY, variables: { after: cursor || null } }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.errors)
      throw new Error(`Shopify napaka (HTTP ${res.status}): ${JSON.stringify(out.errors || out).slice(0, 300)}`);

    const sql = db();
    await ensureSchema();
    const page = out.data.orders;
    let imported = 0, skipped = 0, subs = 0;

    for (const o of page.nodes) {
      const addr = o.shippingAddress || {};
      const cust = o.customer || {};
      const email = (o.email || cust.defaultEmailAddress?.emailAddress || "").trim();
      if (!email) { skipped++; continue; }
      const name = addr.name || [cust.firstName, cust.lastName].filter(Boolean).join(" ") || email;
      const num = parseInt(String(o.name).replace(/\D/g, ""), 10) || 0;
      const total = cents(o.totalPriceSet), ship = cents(o.totalShippingPriceSet), sub = cents(o.subtotalPriceSet);

      const ins = await sql`INSERT INTO orders (number, status, payment, name, email, phone, address, zip, city, country,
          lang, subtotal_cents, shipping_cents, cod_fee_cents, total_cents, created_at, source, external_id)
        VALUES (${num}, ${o.cancelledAt ? "preklicano" : "zakljuceno"}, 'shopify', ${name}, ${email},
          ${o.phone || addr.phone || null}, ${[addr.address1, addr.address2].filter(Boolean).join(", ") || "-"},
          ${addr.zip || "-"}, ${addr.city || "-"}, ${addr.countryCodeV2 || "SI"}, 'sl',
          ${sub}, ${ship}, 0, ${total}, ${o.createdAt}, 'shopify', ${o.id})
        ON CONFLICT (external_id) DO NOTHING RETURNING id`;
      if (!ins.length) { skipped++; continue; }
      imported++;

      const items = (o.lineItems?.nodes || []).filter((li) => li.quantity > 0);
      if (items.length) {
        const size = (li) => (li.variantTitle || "").split("/")[0].trim().toUpperCase() || "-";
        await sql`INSERT INTO order_items (order_id, sku, name, size, qty, price_cents)
          SELECT ${ins[0].id}::bigint, * FROM unnest(
            ${items.map((li) => (li.sku || "").trim().toUpperCase() || "-")}::text[],
            ${items.map((li) => li.name || "-")}::text[],
            ${items.map(size)}::text[],
            ${items.map((li) => li.quantity)}::int[],
            ${items.map((li) => cents(li.originalUnitPriceSet))}::int[])`;
      }

      if (cust.defaultEmailAddress?.marketingState === "SUBSCRIBED") {
        const s = await sql`INSERT INTO subscribers (email, lang) VALUES (${email.toLowerCase()}, 'sl')
          ON CONFLICT (email) DO NOTHING RETURNING id`;
        if (s.length) subs++;
      }
    }

    return NextResponse.json({
      ok: true, imported, skipped, subscribers: subs,
      hasMore: page.pageInfo.hasNextPage, cursor: page.pageInfo.endCursor,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e?.message || e) }, { status: 500 });
  }
}
