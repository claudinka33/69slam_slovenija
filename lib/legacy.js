import { db, dbConfigured } from "./db";
import { getProducts, primeCatalog } from "./catalog";
import { LANGS } from "./i18n";

/*
 * Stare Shopify povezave (Google, objave, oglasi) → nova trgovina, s trajno preusmeritvijo 301,
 * da Google prenese uvrstitve na nove naslove.
 * Zemljevid »Shopify handle → Shopify ID« se enkrat prebere iz Shopifyja in shrani v settings 'legacy_urls'.
 */

let _map = null, _at = 0;
async function handleMap() {
  if (_map && Date.now() - _at < 10 * 60 * 1000) return _map;
  if (!dbConfigured()) return (_map = {});
  try {
    const [r] = await db()`SELECT value FROM settings WHERE key = 'legacy_urls'`;
    _map = r?.value?.products || {};
  } catch { _map = _map || {}; }
  _at = Date.now();
  return _map;
}

/** Kategorija po ključnih besedah v starem naslovu. */
function byKeywords(text, lang) {
  const t = String(text || "").toLowerCase();
  if (/zensk|zenski|zenska|women|otros|otrok|kids|djec|deck|bikini|kimono/.test(t)) return `/${lang}/vse-more-ven`;
  if (/kopal|swim|boardshort|kupa/.test(t)) return `/${lang}/kopalke`;
  if (/kap[ae]|nogav|sock|cap|dodat|majic|hlace|t-shirt/.test(t)) return `/${lang}/dodatki`;
  return `/${lang}`;
}

const PAGES = [
  [/o-nas|about|zgodba|story/, "/zgodba"],
  [/dostav|shipping|placil/, "/info/dostava-in-placilo"],
  [/vracil|return|odstop|menjav/, "/info/vracila-in-odstop"],
  [/reklamac/, "/info/reklamacije"],
  [/zasebn|privacy/, "/info/zasebnost"],
  [/piskot|cookie/, "/info/piskotki"],
  [/pogoj|terms/, "/info/splosni-pogoji"],
];

/** Iz poti stare trgovine vrne nov naslov (vedno nekaj — nikoli 404). */
export async function legacyTarget(rawPath) {
  const parts = String(rawPath || "").split("/").filter(Boolean).map((s) => decodeURIComponent(s).toLowerCase());
  let lang = "sl";
  if (parts[0] && /^[a-z]{2}(-[a-z]{2})?$/.test(parts[0]) && !["products", "collections", "pages", "blogs", "policies"].includes(parts[0])) {
    const l = parts.shift().slice(0, 2);
    if (LANGS.includes(l)) lang = l;
  }
  const kind = parts[0] || "";
  // /products/x ali /collections/y/products/x
  const pi = parts.indexOf("products");
  if (pi >= 0 && parts[pi + 1]) {
    const handle = parts[pi + 1];
    const map = await handleMap();
    const id = map[handle];
    if (id) {
      await primeCatalog();
      const p = getProducts({ withEmpty: true }).find((x) => String(x.shopify_id || "") === String(id));
      if (p?.slug) return `/${lang}/p/${p.slug}`;
    }
    return byKeywords(handle, lang);
  }
  if (kind === "collections") return byKeywords(parts[1] || "", lang);
  if (kind === "pages" || kind === "policies") {
    const h = parts[1] || "";
    for (const [re, to] of PAGES) if (re.test(h)) return `/${lang === "sl" ? "sl" : lang}${to}`;
    return `/${lang}`;
  }
  if (kind === "cart") return `/${lang}/kosarica`;
  return `/${lang}`;
}

/** Enkratni prepis zemljevida iz Shopifyja (javni products.json, vse strani). */
export async function buildLegacyMap() {
  const hosts = [process.env.SHOPIFY_STORE_DOMAIN, "69slam.si"].filter(Boolean);
  let last = null;
  for (const host of hosts) {
    try {
      const products = {};
      for (let page = 1; page <= 20; page++) {
        const r = await fetch(`https://${host}/products.json?limit=250&page=${page}`, { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error(`${host}: HTTP ${r.status}`);
        const j = await r.json();
        const list = j?.products || [];
        for (const p of list) products[String(p.handle).toLowerCase()] = String(p.id);
        if (list.length < 250) break;
      }
      if (!Object.keys(products).length) throw new Error(`${host}: ni izdelkov`);
      await primeCatalog();
      const ids = new Set(getProducts({ withEmpty: true }).map((p) => String(p.shopify_id || "")));
      const matched = Object.values(products).filter((id) => ids.has(id)).length;
      const value = { products, source: host, at: new Date().toISOString() };
      await db()`INSERT INTO settings (key, value) VALUES ('legacy_urls', ${JSON.stringify(value)}::jsonb)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      _map = products; _at = Date.now();
      return { ok: true, source: host, handles: Object.keys(products).length, matched };
    } catch (e) { last = e; }
  }
  throw last || new Error("Shopify ni dosegljiv.");
}

export async function legacyInfo() {
  if (!dbConfigured()) return null;
  const [r] = await db()`SELECT value FROM settings WHERE key = 'legacy_urls'`;
  return r?.value ? { source: r.value.source, at: r.value.at, handles: Object.keys(r.value.products || {}).length } : null;
}
