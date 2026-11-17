import { db } from "./db";
import fs from "node:fs";
import path from "node:path";

/* ---------- KONSIGNACIJSKA SKLADIŠČA (npr. Samana, Bovec) ----------
 * Zaloga pri stranki je ločena od glavne zaloge (variants) — trgovina je ne vidi.
 * Ključ je SKU v obliki glavne zaloge (KODA-VELIKOST, npr. SLBORG-S), da vračilo in nabavne cene delujejo.
 * Račun z izbranim skladiščem odšteje od tega skladišča; vračilo prenese kose v glavno skladišče. */
export const WAREHOUSES = { samana: "Samana (konsignacija)" };
export const whName = (wh) => WAREHOUSES[wh] || "Glavno skladišče";
export const isConsign = (wh) => !!WAREHOUSES[wh];

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
export const skuKey = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();

/** Šifra iz Metakocke/cenika (npr. »SLBORG-PM S-S«, »GSSWGN-PA-S«, »XTGVW -PO L-L«) → { code, size, sku }. */
export function parseCode(src) {
  const s = clean(src).toUpperCase();
  const code = s.split("-")[0].replace(/\s+/g, "");
  let size = s.includes("-") ? s.slice(s.lastIndexOf("-") + 1).trim() : "";
  if (!size) { const m = s.match(/\s(\S+)$/); size = m ? m[1] : "ONE"; }
  if (/^[A-Z]{2}$/.test(size) && !["XS", "XL"].includes(size)) size = "ONE"; // npr. »-PA« brez velikosti
  return { code, size, sku: `${code}-${size}` };
}

/** Začetna zaloga (enkrat): če skladišče še nima nobenega premika, uvozi priloženo tabelo iz data/. */
const SEED = { samana: ["samana-zaloga-2026-11-17.json", "Začetna zaloga — tabela Samana KONSIGNACIJA 69slam kopalke 2026 (17. 11. 2026)"] };
async function seedOnce(sql, wh) {
  const s = SEED[wh];
  if (!s) return;
  const [m] = await sql`SELECT 1 FROM consign_moves WHERE wh = ${wh} LIMIT 1`;
  if (m) return;
  const rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", s[0]), "utf8"));
  await consignImport(wh, rows, s[1]);
}

export async function consignList(wh) {
  const sql = db();
  await seedOnce(sql, wh);
  const rows = await sql`SELECT c.sku, c.code, c.size, c.src_code, c.name, c.qty, c.price_cents, c.updated_at,
      p.cost_cents, (SELECT stock FROM variants v WHERE upper(v.sku) = upper(c.sku) LIMIT 1) AS main_stock
    FROM consign_stock c LEFT JOIN products p ON upper(p.code) = upper(c.code)
    WHERE c.wh = ${wh} ORDER BY c.qty = 0, c.name, c.sku`;
  const moves = await sql`SELECT sku, delta, reason, note, created_at FROM consign_moves WHERE wh = ${wh} ORDER BY id DESC LIMIT 200`;
  return { rows, moves };
}

async function move(sql, wh, sku, delta, reason, note) {
  await sql`INSERT INTO consign_moves (wh, sku, delta, reason, note) VALUES (${wh}, ${sku}, ${delta}, ${reason}, ${note || null})`;
}

/**
 * Uvoz zaloge iz tabele: rows [{ code (šifra), name, qty, price (MPC z DDV) }].
 * Nastavi TOČNO stanje za uvožene artikle (kot inventura); ostalih ne spreminja.
 */
export async function consignImport(wh, rows, note = "Uvoz zaloge") {
  const sql = db();
  const agg = {};
  for (const r of rows || []) {
    const src = clean(r.code);
    if (!src) continue;
    const p = parseCode(src);
    const qty = Math.round(Number(String(r.qty ?? 0).replace(",", ".")) || 0);
    const ps = String(r.price ?? "").replace(/[€\s]/g, "");
    const price = Math.round((Number(ps.includes(",") ? ps.replace(/\./g, "").replace(",", ".") : ps) || 0) * 100) || null;
    const a = (agg[p.sku] = agg[p.sku] || { ...p, src, name: clean(r.name), qty: 0, price });
    a.qty += qty;
    if (price) a.price = price;
  }
  let n = 0, pcs = 0;
  for (const a of Object.values(agg)) {
    const [cur] = await sql`SELECT qty FROM consign_stock WHERE wh = ${wh} AND sku = ${a.sku}`;
    await sql`INSERT INTO consign_stock (wh, sku, code, size, src_code, name, qty, price_cents)
      VALUES (${wh}, ${a.sku}, ${a.code}, ${a.size}, ${a.src}, ${a.name}, ${a.qty}, ${a.price})
      ON CONFLICT (wh, sku) DO UPDATE SET qty = EXCLUDED.qty, src_code = EXCLUDED.src_code, name = EXCLUDED.name,
        price_cents = COALESCE(EXCLUDED.price_cents, consign_stock.price_cents), updated_at = now()`;
    const d = a.qty - (cur?.qty || 0);
    if (d) await move(sql, wh, a.sku, d, "uvoz", note);
    n++; pcs += a.qty;
  }
  return { n, pcs };
}

/** Ročni popravek stanja enega artikla (točno število). */
export async function consignSet(wh, sku, qty, note) {
  const sql = db();
  const q = Math.max(0, Math.round(Number(qty) || 0));
  const [cur] = await sql`SELECT qty FROM consign_stock WHERE wh = ${wh} AND sku = ${sku}`;
  if (!cur) throw new Error("Artikla ni v tem skladišču.");
  await sql`UPDATE consign_stock SET qty = ${q}, updated_at = now() WHERE wh = ${wh} AND sku = ${sku}`;
  if (q !== cur.qty) await move(sql, wh, sku, q - cur.qty, "rocno", note || "Ročni popravek");
}

/** Odšteje postavke dokumenta [{code, qty}] od konsignacije. Vrne { ok, unknown, taken }. */
export async function consignTake(wh, lines, note) {
  const sql = db();
  const out = { ok: [], unknown: [], taken: [] };
  for (const l of lines) {
    const qty = Math.round(Number(l.qty) || 0);
    if (qty <= 0 || !String(l.code || "").trim()) continue;
    const key = skuKey(l.code);
    let [v] = await sql`SELECT sku FROM consign_stock WHERE wh = ${wh} AND upper(replace(sku, ' ', '')) = ${key} LIMIT 1`;
    if (!v) [v] = await sql`SELECT sku FROM consign_stock WHERE wh = ${wh} AND upper(replace(src_code, ' ', '')) = ${key} LIMIT 1`;
    if (!v) { out.unknown.push(l.code); continue; }
    await sql`UPDATE consign_stock SET qty = qty - ${qty}, updated_at = now() WHERE wh = ${wh} AND sku = ${v.sku}`;
    await move(sql, wh, v.sku, -qty, "prodaja", note);
    out.ok.push(`${v.sku} −${qty}`); out.taken.push({ sku: v.sku, qty, wh });
  }
  return out;
}

/** Vrne kose v konsignacijo (storno/dobropis). */
export async function consignPut(wh, items, note, reason = "vracilo") {
  const sql = db();
  const out = { ok: [], unknown: [] };
  for (const t of items) {
    const key = skuKey(t.sku || t.code);
    const [v] = key ? await sql`SELECT sku FROM consign_stock WHERE wh = ${wh} AND (upper(replace(sku, ' ', '')) = ${key} OR upper(replace(src_code, ' ', '')) = ${key}) LIMIT 1` : [];
    if (!v) { out.unknown.push(t.sku || t.code); continue; }
    await sql`UPDATE consign_stock SET qty = qty + ${t.qty}, updated_at = now() WHERE wh = ${wh} AND sku = ${v.sku}`;
    await move(sql, wh, v.sku, t.qty, reason, note);
    out.ok.push(`${v.sku} +${t.qty}`);
  }
  return out;
}

/**
 * Vračilo iz konsignacije v glavno skladišče: items [{ sku, qty }].
 * Če velikosti v glavni zalogi še ni (izdelek pa obstaja), jo doda.
 */
export async function consignReturn(wh, items, note) {
  const sql = db();
  const out = { ok: [], unknown: [] };
  for (const it of items || []) {
    const qty = Math.round(Number(it.qty) || 0);
    if (qty <= 0) continue;
    const [c] = await sql`SELECT * FROM consign_stock WHERE wh = ${wh} AND sku = ${it.sku}`;
    if (!c) { out.unknown.push(it.sku); continue; }
    if (qty > c.qty) throw new Error(`${c.sku}: pri ${whName(wh)} je samo ${c.qty} kos.`);
    let [v] = await sql`SELECT sku FROM variants WHERE upper(replace(sku, ' ', '')) = ${skuKey(c.sku)} LIMIT 1`;
    if (!v) {
      const [p] = await sql`SELECT code FROM products WHERE upper(code) = ${c.code}`;
      if (p) [v] = await sql`INSERT INTO variants (sku, code, size, stock) VALUES (${c.sku}, ${p.code}, ${c.size}, 0) ON CONFLICT (sku) DO UPDATE SET sku = EXCLUDED.sku RETURNING sku`;
    }
    if (!v) { out.unknown.push(`${c.sku} (${c.name})`); continue; }
    await sql`UPDATE consign_stock SET qty = qty - ${qty}, updated_at = now() WHERE wh = ${wh} AND sku = ${c.sku}`;
    await move(sql, wh, c.sku, -qty, "vracilo", note || "Vračilo v glavno skladišče");
    await sql`UPDATE variants SET stock = stock + ${qty} WHERE sku = ${v.sku}`;
    await sql`INSERT INTO stock_moves (sku, delta, reason, note) VALUES (${v.sku}, ${qty}, 'vracilo', ${note || `Vračilo iz konsignacije ${whName(wh)}`})`;
    out.ok.push(`${v.sku} +${qty}`);
  }
  return out;
}
