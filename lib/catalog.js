import fs from "node:fs";
import path from "node:path";

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
export const BUNDLE_N = 3;
export const BUNDLE_OFF = 0.15; // Paket 3 = −15 %
export const SALE_OFF = 0.5;    // odprodaja (zadnja velikost) = −50 %
export const FREE_SHIPPING_FROM = 50;
export const SHIPPING_FEE = 5;
export const COD_FEE = 1.5;

let _catalog = null;

function loadCatalog() {
  if (_catalog) return _catalog;
  const raw = fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8");
  _catalog = JSON.parse(raw);
  return _catalog;
}

function imgSrc(image) {
  if (process.env.NEXT_PUBLIC_LOCAL_IMAGES === "1") return `/img/products/${image.file}`;
  // Shopify CDN zna sliko sam pomanjsati - hitrejse nalaganje
  return image.src_url.includes("cdn.shopify.com") ? `${image.src_url}&width=900` : image.src_url;
}

/** Izdelek, obogaten za prikaz: zaloga, odprodaja, efektivna cena, slike. */
function enrich(p) {
  const stock = {};
  for (const v of p.variants) stock[v.size] = v.stock_snapshot;
  const sizesInStock = SIZE_ORDER.filter((s) => (stock[s] || 0) > 0);
  const totalStock = Object.values(stock).reduce((a, b) => a + b, 0);
  const sale = sizesInStock.length === 1; // samo še ena velikost → odprodaja −50 %
  const effPrice = sale ? +(p.price * (1 - SALE_OFF)).toFixed(2) : p.price;
  return {
    code: p.code,
    name: p.cut === "hip" ? `${p.name} HIP` : p.name,
    cut: p.cut || "box",
    slug: p.slug,
    collection: p.collection,
    price: p.price,
    effPrice,
    sale,
    stock,
    totalStock,
    images: p.images.map((im) => ({ src: imgSrc(im), role: im.role })),
    img: p.images.length ? imgSrc(p.images[0]) : null,
  };
}

/** Aktivni izdelki z zalogo — razprodani izginejo s strani. */
export function getProducts() {
  const all = loadCatalog().products
    .filter((p) => p.status === "ACTIVE")
    .map(enrich)
    .filter((p) => p.totalStock > 0);
  all.sort((a, b) => (a.sale ? 1 : 0) - (b.sale ? 1 : 0) || b.totalStock - a.totalStock);
  return all;
}

export function getProductBySlug(slug) {
  return getProducts().find((p) => p.slug === slug) || null;
}

export function getSharedDescription() {
  return loadCatalog().shared_description_sl;
}
