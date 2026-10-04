import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db, dbConfigured, ensureSchema, catalogMeta } from "../../../../lib/db";

let _mk = null;
/** Nabavne cene iz cenikov Metakocke (tudi za artikle, ki jih ni več v katalogu). */
function mkCosts() {
  if (!_mk) _mk = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/mk-costs.json"), "utf8"));
  return _mk;
}
/** Nabavna (v centih) iz Metakocke: { cents, est } — est = ocena po povprečju skupine (prve 3 črke). */
function mkCostOf(sku) {
  const mk = mkCosts();
  const s = String(sku || "").trim();
  const [a, ...rest] = s.split("-");
  const s0 = a.replace(/\s+/g, "").toUpperCase();
  const s1 = (rest.join("-").trim().split(/[\s-]+/)[0] || "").toUpperCase();
  for (const k of [s0 + s1, s0]) if (mk.codes[k] != null) return { cents: Math.round(mk.codes[k] * 100), est: false };
  const p = mk.prefix[s0.slice(0, 3)];
  return p != null ? { cents: Math.round(p * 100), est: true } : null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VAT = 0.22;

/** Iz SKU-ja (tudi Shopify oblike »MBYPOW-PO S«) najde kodo artikla. */
function codeOf(sku, bySku, codes) {
  const s = String(sku || "").trim();
  if (bySku[s]) return bySku[s];
  const ns = s.replace(/\s+/g, "");
  if (bySku[ns]) return bySku[ns];
  if (!s.includes("-")) return codes.has(ns.toUpperCase()) ? ns.toUpperCase() : null;
  const [a, ...rest] = s.split("-");
  const s0 = a.replace(/\s+/g, "").toUpperCase();
  const s1 = (rest.join("-").trim().split(/[\s-]+/)[0] || "").toUpperCase();
  for (const c of [s0 + s1, s0]) if (codes.has(c)) return c;
  return null;
}

/**
 * Čisti RVC od prodaje: ?from=YYYY-MM-DD&to=YYYY-MM-DD (vključno).
 * Prihodek = dejanske cene artiklov (popusti na naročilu razporejeni po artiklih), brez DDV in brez poštnine.
 * + arhiv Metakocke (računi brez naročila v bazi in dobropisi).
 * Nabavna = shranjena ob naročilu, sicer današnja nabavna artikla.
 */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const u = new URL(req.url);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("from") || "") ? u.searchParams.get("from") : "2000-01-01";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("to") || "") ? u.searchParams.get("to") : "2100-01-01";
  const sql = db();
  await ensureSchema();
  const [orders, items, prods, vars] = await Promise.all([
    sql`SELECT id, subtotal_cents, shipping_cents, total_cents, source,
          to_char(created_at AT TIME ZONE 'Europe/Ljubljana', 'YYYY-MM') AS ym
        FROM orders WHERE status <> 'preklicano'
          AND (created_at AT TIME ZONE 'Europe/Ljubljana')::date BETWEEN ${from}::date AND ${to}::date`,
    sql`SELECT i.order_id, i.sku, i.name, i.qty, i.price_cents, i.cost_cents FROM order_items i
        JOIN orders o ON o.id = i.order_id WHERE o.status <> 'preklicano'
          AND (o.created_at AT TIME ZONE 'Europe/Ljubljana')::date BETWEEN ${from}::date AND ${to}::date`,
    sql`SELECT code, name, cost_cents FROM products`,
    sql`SELECT sku, code FROM variants`,
  ]);
  const cost = {}, pname = {};
  for (const p of prods) { cost[p.code] = p.cost_cents; pname[p.code] = p.name; }
  const bySku = {};
  for (const v of vars) bySku[v.sku] = v.code;
  const codes = new Set(prods.map((p) => p.code));
  const meta = catalogMeta();

  const byOrder = {};
  for (const it of items) (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);

  const T = { estQty: 0, orders: orders.length, qty: 0, gross: 0, net: 0, cost: 0, shipping: 0, missQty: 0, missNet: 0 };
  const months = {}, arts = {}, groups = {};
  const add = (m, k, o) => { const x = (m[k] = m[k] || { qty: 0, gross: 0, net: 0, cost: 0, missQty: 0, missNet: 0, orders: 0 }); for (const f in o) x[f] += o[f]; return x; };
  for (const o of orders) {
    const list = byOrder[o.id] || [];
    const sum = list.reduce((a, i) => a + i.price_cents * i.qty, 0);
    // popust na naročilu (npr. koda) razporedimo sorazmerno
    const f = sum > 0 && o.subtotal_cents > 0 && o.subtotal_cents < sum ? o.subtotal_cents / sum : 1;
    T.shipping += o.shipping_cents || 0;
    add(months, o.ym, { orders: 1 });
    for (const i of list) {
      const gross = i.price_cents * i.qty * f;
      const net = gross / (1 + VAT);
      const code = codeOf(i.sku, bySku, codes);
      let unit = i.cost_cents ?? (code ? cost[code] : null);
      let est = 0;
      if (unit == null) { const m = mkCostOf(i.sku); if (m) { unit = m.cents; if (m.est) est = i.qty; } }
      T.estQty += est;
      const c = unit != null ? unit * i.qty : 0;
      const miss = unit == null ? i.qty : 0;
      T.qty += i.qty; T.gross += gross; T.net += net; T.cost += c; T.missQty += miss; if (miss) T.missNet += net;
      const mn = miss ? net : 0;
      add(months, o.ym, { qty: i.qty, gross, net, cost: c, missQty: miss, missNet: mn });
      const key = code || `?${i.sku}`;
      const a = add(arts, key, { qty: i.qty, gross, net, cost: c, missQty: miss, missNet: mn });
      a.name = a.name || (code ? pname[code] : i.name); a.code = code || i.sku;
      const g = code ? (meta[code]?.gender === "moski" ? meta[code]?.group || "drugo" : meta[code]?.gender || "drugo") : "neznano";
      add(groups, g, { qty: i.qty, gross, net, cost: c, missQty: miss, missNet: mn });
    }
  }
  // arhiv Metakocke: računi, ki niso povezani z naročilom v bazi (osebno, Instagram, B2B, starejši Shopify),
  // in dobropisi (razen k naročilom, ki so v bazi že preklicana)
  const mk = await sql`SELECT i.kind, i.items, to_char(i.issued_at AT TIME ZONE 'Europe/Ljubljana', 'YYYY-MM') AS ym
    FROM invoices i LEFT JOIN orders o ON o.id = i.order_id
    WHERE i.series = 'MK' AND i.status = 'arhiv'
      AND (i.issued_at AT TIME ZONE 'Europe/Ljubljana')::date BETWEEN ${from}::date AND ${to}::date
      AND (i.order_id IS NULL OR (i.kind = 'dobropis' AND o.status <> 'preklicano'))`;
  T.mkDocs = mk.length;
  for (const d of mk) {
    if (d.kind === "racun") { T.orders += 1; add(months, d.ym, { orders: 1 }); }
    for (const l of d.items || []) {
      const qty = Number(l.qty) || 0;
      const net = qty * (Number(l.price) || 0) * (1 - (Number(l.disc) || 0) / 100) * 100;
      const gross = net * (1 + (Number(l.vat) || 0) / 100);
      if (String(l.unit || "").toLowerCase().startsWith("stor") || /dostav|po[šs]tnin|povzet|odkupnin/i.test(String(l.desc || ""))) { T.shipping += gross; continue; }
      const code = l.code ? codeOf(l.code, bySku, codes) : null;
      let unit = code ? cost[code] : null;
      let est = 0;
      if (unit == null && l.code) { const m = mkCostOf(l.code); if (m) { unit = m.cents; if (m.est) est = Math.abs(qty); } }
      T.estQty += est;
      const c = unit != null ? unit * qty : 0;
      const miss = unit == null ? qty : 0;
      const mn = miss ? net : 0;
      T.qty += qty; T.gross += gross; T.net += net; T.cost += c; T.missQty += miss; T.missNet += mn;
      add(months, d.ym, { qty, gross, net, cost: c, missQty: miss, missNet: mn });
      const key = code || `?${l.code || l.desc}`;
      const a = add(arts, key, { qty, gross, net, cost: c, missQty: miss, missNet: mn });
      a.name = a.name || (code ? pname[code] : l.desc); a.code = code || l.code || "—";
      const g = code ? (meta[code]?.gender === "moski" ? meta[code]?.group || "drugo" : meta[code]?.gender || "drugo") : "neznano";
      add(groups, g, { qty, gross, net, cost: c, missQty: miss, missNet: mn });
    }
  }
  const fin = (x) => ({ ...x, gross: Math.round(x.gross), net: Math.round(x.net), cost: Math.round(x.cost),
    rvc: Math.round(x.net - x.cost - (x.missNet || 0)), missNet: Math.round(x.missNet || 0) });
  return NextResponse.json({
    ok: true, from, to,
    total: { ...fin(T), shipping: Math.round(T.shipping), missNet: Math.round(T.missNet) },
    months: Object.entries(months).sort().map(([ym, x]) => ({ ym, ...fin(x) })),
    groups: Object.entries(groups).map(([g, x]) => ({ g, ...fin(x) })).sort((a, b) => b.rvc - a.rvc),
    articles: Object.values(arts).map((x) => fin(x)).sort((a, b) => b.rvc - a.rvc).slice(0, 50),
    missing: Object.values(arts).filter((x) => x.missQty > 0).map((x) => ({ code: x.code, name: x.name, qty: x.missQty, net: Math.round(x.missNet) })).sort((a, b) => b.qty - a.qty).slice(0, 100),
  });
}
