// Kopije slik s Shopify CDN v Vercel Blob (tabela image_mirror).
// Ko je slika kopirana, trgovina namesto Shopify naslova uporabi kopijo – tako slike ostanejo, tudi ko Shopify zapremo.

let MAP = {};

/** Ključ = Shopify naslov brez ?v=… in &width=… */
export const mirrorKey = (url) => String(url || "").split("?")[0];

export function setMirror(map) {
  if (map && typeof map === "object") MAP = map;
}

/** Shopify naslov → kopija v Blobu (če obstaja), sicer Shopify naslov z želeno širino. */
export function mirrorUrl(url, width) {
  if (!url || !String(url).includes("cdn.shopify.com")) return url;
  const hit = MAP[mirrorKey(url)];
  if (hit) return hit;
  if (!width) return url;
  const clean = String(url).replace(/[?&]width=\d+/g, "").replace(/[?&]format=jpg/g, "");
  const sep = clean.includes("?") ? "&" : "?";
  const fmt = /\.heic(\?|$)/i.test(clean) ? "&format=jpg" : "";
  return `${clean}${sep}width=${width}${fmt}`;
}

/** Naloži kopije iz baze (predpomnjeno, osveži se z revalidateTag("catalog")). */
export async function loadMirrorMap() {
  try {
    const { db, dbConfigured } = await import("./db");
    if (!dbConfigured()) return {};
    const rows = await db()`SELECT src, url FROM image_mirror`;
    const m = {};
    for (const r of rows) m[r.src] = r.url;
    return m;
  } catch {
    return {};
  }
}
