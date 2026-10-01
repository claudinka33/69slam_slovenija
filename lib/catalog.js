import fs from "node:fs";
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

let _dbImages = null;
/** Slike iz baze (data/db-images.json pripravi prebuild) za artikle, ki niso iz Shopifyja. */
function dbImages() {
  if (_dbImages) return _dbImages;
  try { _dbImages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/db-images.json"), "utf8")); }
  catch { _dbImages = {}; }
  return _dbImages;
}
function imagesOf(p) {
  if (p.images?.length) return p.images;
  return (dbImages()[p.code] || []).map((u, i) => ({ src_url: u, role: i === 0 ? "main" : "gallery", file: "" }));
}
/** Na spletu: aktivni iz Shopifyja + artikli iz Metakocke, ki imajo slike in ceno. */
function isPublished(p) {
  if (p.status === "ACTIVE") return true;
  return p.source === "metakocka" && p.price > 0 && p.group !== "embalaza" && (dbImages()[p.code] || []).length > 0;
}

function imgSrc(image, width = 900) {
  if (process.env.NEXT_PUBLIC_LOCAL_IMAGES === "1" && image.file) return `/img/products/${image.file}`;
  const url = image.src_url;
  if (!url.includes("cdn.shopify.com")) return url;
  // Shopify CDN zna sliko pomanjšati; HEIC pretvori v JPG (brskalniki HEIC ne prikažejo)
  const fmt = /\.heic(\?|$)/i.test(url) ? "&format=jpg" : "";
  return `${url}&width=${width}${fmt}`;
}

/** Izdelek, obogaten za prikaz: zaloga, odprodaja, efektivna cena, slike. */
function enrich(p) {
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
    name: p.cut === "hip" && isMicroBox ? `${p.name} HIP` : p.name,
    cut: p.cut || "box",
    slug: p.slug,
    collection: p.collection,
    gender,
    group,
    material: p.material || (group === "boksarice" ? "mikrofibra" : null),
    type: p.type_sl || null,
    price: p.price,
    effPrice,
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
export function getProducts({ withEmpty = false } = {}) {
  const all = loadCatalog().products
    .filter(isPublished)
    .map(enrich)
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
