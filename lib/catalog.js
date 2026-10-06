import fs from "node:fs";
import { cutDescription } from "./descriptions";
import path from "node:path";

import { SIZE_ORDER, sortSizes, skuOf } from "./sizes";
export { SIZE_ORDER, sortSizes, skuOf };
export const BUNDLE_N = 3;
export const BUNDLE_OFF = 0.15; // Paket 3 = −15 %
export const SALE_OFF = 0.5;    // odprodaja (zadnja velikost boksaric) = −50 %
export const OUTLET_OFF = 0.5;  // ženske + otroci »VSE MORE VEN« = −50 %
export const FREE_SHIPPING_FROM = 50;
export const SHIPPING_FEE = 5;
export const COD_FEE = 1.5;

/** Skupine artiklov (moški del trgovine) v vrstnem redu prikaza. */
export const MEN_GROUPS = ["boksarice", "kopalke", "oblacila", "obutev", "dodatki"];

let _catalog = null;

function loadCatalog() {
  if (_catalog) return _catalog;
  const raw = fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8");
  _catalog = JSON.parse(raw);
  return _catalog;
}

let _ov = { edits: {}, images: {}, low30: {} };
/** Pred uporabo kataloga na strani/API-ju: naloži urejanja iz CMS. */
export async function primeCatalog() {
  try {
    const { loadOverrides } = await import("./overrides");
    _ov = await loadOverrides();
  } catch { /* brez baze */ }
}
const ed = (code) => _ov.edits[code] || {};

let _dbImages = null;
/** Slike iz baze (data/db-images.json pripravi prebuild) za artikle, ki niso iz Shopifyja. */
function dbImages() {
  if (_dbImages) return _dbImages;
  try { _dbImages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/db-images.json"), "utf8")); }
  catch { _dbImages = {}; }
  return _dbImages;
}
function imagesOf(p) {
  const own = _ov.images[p.code];
  if (own?.length) return own.map((u, i) => ({ src_url: u, role: i === 0 ? "main" : "gallery", file: "" }));
  if (p.images?.length) return p.images;
  return (dbImages()[p.code] || []).map((u, i) => ({ src_url: u, role: i === 0 ? "main" : "gallery", file: "" }));
}
/** Na spletu: aktivni iz Shopifyja + artikli iz Metakocke, ki imajo slike in ceno. */
// Obeski za ključe niso v ponudbi spletne trgovine (ostanejo v zalogi/adminu).
const isKeychain = (p) => /OBESEK/i.test(`${p.type || ""} ${p.name || ""}`);

function isPublished(p) {
  if (isKeychain(p)) return false;
  const e = ed(p.code);
  if (e.published === true || e.published === false) return e.published;
  if (p.status === "ACTIVE") return true;
  return p.source === "metakocka" && p.price > 0 && p.group !== "embalaza"
    && ((_ov.images[p.code] || []).length > 0 || (dbImages()[p.code] || []).length > 0);
}

function imgSrc(image, width = 900) {
  if (process.env.NEXT_PUBLIC_LOCAL_IMAGES === "1" && image.file) return `/img/products/${image.file}`;
  const url = image.src_url;
  if (!url.includes("cdn.shopify.com")) return url;
  // Shopify CDN zna sliko pomanjšati; HEIC pretvori v JPG (brskalniki HEIC ne prikažejo)
  const fmt = /\.heic(\?|$)/i.test(url) ? "&format=jpg" : "";
  return `${url}&width=${width}${fmt}`;
}

/** URL slike iz kataloga (za CMS). */
export const imgSrcOf = (im) => (im && im.src_url ? imgSrc(im) : null);

/** Izdelek, obogaten za prikaz: zaloga, odprodaja, efektivna cena, slike. */
function enrich(p0) {
  const e = ed(p0.code);
  const p = { ...p0,
    price: e.price_cents != null ? e.price_cents / 100 : p0.price,
    type_sl: e.type_sl || p0.type_sl,
  };
  // ženski športni topi (fitnes linija) so bili v uvozu napačno pod »Dodatki« / »Ženska majica«
  if (/^(OFB|OXG|OXB|GYC)/.test(p0.code || "")) {
    p.group = "oblacila"; p.gender = "zenske";
    if (!e.type_sl) p.type_sl = "Ženski športni top";
  }
  const gender = p.gender || "moski";
  const group = p.group || "boksarice";
  const stock = {};
  for (const v of p.variants) stock[v.size] = (stock[v.size] || 0) + (v.stock_snapshot || 0);
  const sizes = sortSizes(Object.keys(stock));
  const sizesInStock = sizes.filter((s) => (stock[s] || 0) > 0);
  const totalStock = Object.values(stock).reduce((a, b) => a + b, 0);
  const outlet = gender !== "moski";
  // odprodaja zadnje velikosti velja samo za moške boksarice
  const sale = !outlet && group === "boksarice" && sizesInStock.length === 1;
  const off = outlet ? OUTLET_OFF : sale ? SALE_OFF : 0;
  const effPrice = off ? +(p.price * (1 - off)).toFixed(2) : p.price;
  const isMicroBox = group === "boksarice" && (p.material || "mikrofibra") === "mikrofibra";
  return {
    code: p.code,
    name: e.name ? e.name : p.cut === "hip" && isMicroBox ? `${p.name} HIP` : p.name,
    description: e.description || null,
    cut: p.cut || "box",
    slug: p.slug,
    shopify_id: p.shopify_id || null,
    collection: p.collection,
    gender,
    group,
    material: p.material || (group === "boksarice" ? "mikrofibra" : null),
    type: p.type_sl || null,
    price: p.price,
    effPrice,
    // najnižja redna cena v zadnjih 30 dneh (zakon o varstvu potrošnikov / Omnibus)
    low30: Math.min(p.price, (_ov.low30?.[p.code] ?? Infinity) / 100),
    sale,
    outlet,
    bundleable: gender === "moski" && group === "boksarice" && !sale,
    stock,
    sizes,
    totalStock,
    images: imagesOf(p).map((im) => ({ src: imgSrc(im), role: im.role })),
    img: imagesOf(p).length ? imgSrc(imagesOf(p)[0]) : null,
  };
}

/** Aktivni izdelki. Privzeto samo z zalogo (po posnetku);
 *  withEmpty: tudi razprodani — trgovina jih skrije/pokaže glede na živo zalogo iz baze. */
/* ---------- kompleti (isti dizajn: zgornji + spodnji del / kopalna majica + kopalne hlače) ---------- */
const setKey = (p) => `${p.gender}|${String(p.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
/** Vloga kosa v kompletu: top/bottom (ženske kopalke) ali shirt/shorts (moške kopalke). */
export function setRole(p) {
  if (p.group !== "kopalke") return null;
  const t = String(p.type || "").toUpperCase();
  if (t.includes("ZGORNJI")) return "top";
  if (t.includes("SPODNJI")) return "bottom";
  if (t.includes("MAJICA")) return "shirt";
  if (t.includes("KOPALNE HLA")) return "shorts";
  return null;
}
const PARTNER = { top: "bottom", bottom: "top", shirt: "shorts", shorts: "shirt" };
function markSets(list) {
  const roles = {};
  for (const p of list) { const r = setRole(p); if (r && p.totalStock > 0) (roles[setKey(p)] = roles[setKey(p)] || new Set()).add(r); }
  for (const p of list) { const r = setRole(p); p.hasSet = !!(r && roles[setKey(p)]?.has(PARTNER[r])); }
  return list;
}
/** Kosi, ki s tem artiklom tvorijo komplet (isti dizajn, nasprotni del). */
export function getSetPartners(p) {
  const r = setRole(p);
  if (!r) return [];
  return getProducts({ withEmpty: true }).filter((x) => x.code !== p.code && setKey(x) === setKey(p) && setRole(x) === PARTNER[r]);
}

/** »Kaj paše zraven«: artikli iz drugih kategorij, ki dopolnijo izbrani artikel (največ zaloge, nikoli razprodani). */
export function getPairings(p, max = 6) {
  const all = getProducts().filter((x) => x.code !== p.code && x.totalStock > 0 && x.img);
  const T = (x) => String(x.type || "").toUpperCase();
  const pools = [];
  if (p.gender === "moski" && p.group === "boksarice") {
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "dodatki"));
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "oblacila"));
  } else if (p.gender === "moski" && p.group === "kopalke") {
    const shirt = T(p).includes("MAJICA");
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "kopalke" && (shirt ? !T(x).includes("MAJICA") : T(x).includes("MAJICA"))));
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "obutev"));
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "dodatki"));
  } else if (p.gender === "moski") {
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "boksarice" && !x.sale));
    pools.push(all.filter((x) => x.gender === "moski" && x.group === "dodatki" && x.group !== p.group));
  } else {
    pools.push(all.filter((x) => x.gender === p.gender && x.group === "obutev"));
    pools.push(all.filter((x) => x.gender === p.gender && x.group === "dodatki"));
    pools.push(all.filter((x) => x.gender === p.gender && x.group !== p.group && x.group !== "obutev" && x.group !== "dodatki"));
  }
  const sorted = pools.map((l) => l.sort((a, b) => b.totalStock - a.totalStock));
  const out = [], seen = new Set([String(p.name).toUpperCase()]);
  for (let i = 0; out.length < max && i < 200 && sorted.some((l) => l.length > i); i++)
    for (const l of sorted) {
      const x = l[i];
      if (x && out.length < max && !out.includes(x) && !seen.has(String(x.name).toUpperCase())) { out.push(x); seen.add(String(x.name).toUpperCase()); }
    }
  return out;
}

export function getProducts({ withEmpty = false } = {}) {
  const all = markSets(loadCatalog().products
    .filter(isPublished)
    .map(enrich))
    .filter((p) => withEmpty || p.totalStock > 0);
  all.sort((a, b) => (a.sale ? 1 : 0) - (b.sale ? 1 : 0) || b.totalStock - a.totalStock);
  return all;
}

/** Moški del trgovine (glavna stran). */
export const getMenProducts = (o) => getProducts(o).filter((p) => p.gender === "moski");
/** »VSE MORE VEN« — ženske in otroci. */
export const getOutletProducts = (o) => getProducts(o).filter((p) => p.outlet);
/** Moške kopalke (poletni sklop). */
export const getSwimProducts = (o) => getMenProducts(o).filter((p) => p.group === "kopalke");

/** Lahka različica za brskalnik (košarica) — brez galerije slik. */
export function slimProduct(p) {
  const { images, ...rest } = p;
  return rest;
}

export function getProductBySlug(slug) {
  return getProducts({ withEmpty: true }).find((p) => p.slug === slug) || null;
}

export function getSharedDescription() {
  return loadCatalog().shared_description_sl;
}

/** Za CMS: artikel ne glede na objavo (z urejanji, če je bil klican primeCatalog). */
export function getAnyProduct(code) {
  const raw = loadCatalog().products.find((p) => p.code === code);
  return raw ? { ...enrich(raw), published: isPublished(raw), source: raw.source || "shopify", rawImages: raw.images || [] } : null;
}

/** Privzeti opis (enak kot na strani izdelka, ko ni lastnega). */
export function defaultDescription(p, t, lang = "sl") {
  const byCut = cutDescription(p, lang);
  if (byCut) return byCut;
  const micro = p.group === "boksarice" && p.material === "mikrofibra";
  const boxers = p.group === "boksarice";
  return micro ? getSharedDescription()
    : p.material === "bambus" && (boxers || p.group === "perilo") ? t.desc_bambus
    : t[`desc_${p.group}`] || t.desc_perilo;
}

/** Osnovni podatki iz kataloga (brez urejanj iz CMS). */
export function getRawProduct(code) {
  return loadCatalog().products.find((p) => p.code === code) || null;
}
