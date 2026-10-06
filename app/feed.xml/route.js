import { getProducts, defaultDescription, primeCatalog } from "../../lib/catalog";
import { getDict } from "../../lib/i18n";
import { dbConfigured, getStockMap } from "../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Produktni feed za Meta katalog (Commerce Manager) in Google Merchant Center.
 * Naslov: https://<domena>/feed.xml — oba ga lahko samodejno berete vsak dan.
 * ID izdelka = koda artikla (npr. MBYADD), enako kot v dogodkih Pixla.
 */

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const strip = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const money = (n) => `${Number(n).toFixed(2)} EUR`;

const CATEGORY = {
  boksarice: "Apparel & Accessories > Clothing > Underwear & Socks > Underwear",
  perilo: "Apparel & Accessories > Clothing > Underwear & Socks > Underwear",
  kopalke: "Apparel & Accessories > Clothing > Swimwear",
  oblacila: "Apparel & Accessories > Clothing",
  obutev: "Apparel & Accessories > Shoes",
  dodatki: "Apparel & Accessories > Clothing Accessories",
};
const GROUP_SL = {
  boksarice: "Boksarice", perilo: "Spodnje perilo", kopalke: "Kopalke",
  oblacila: "Oblačila", obutev: "Obutev", dodatki: "Dodatki",
};

function title(p) {
  if (p.group === "boksarice" && p.material === "mikrofibra")
    return `69SLAM ${p.cut === "hip" ? "Hip" : "Box"} boksarice mikrofibra – ${p.name}`;
  const type = strip(p.type || "").replace(/\s*·\s*/g, " ").toLowerCase();
  return `69SLAM ${p.name}${type ? " – " + type : ""}`.slice(0, 150);
}

export async function GET(req) {
  await primeCatalog();
  const t = getDict("sl");
  const base = (process.env.SITE_URL || `https://${req.headers.get("host")}`).replace(/\/$/, "");

  let live = null;
  if (dbConfigured()) {
    try { live = await getStockMap(); } catch { live = null; }
  }

  const items = [];
  for (const p0 of getProducts({ withEmpty: true })) {
    if (!p0.img) continue;
    const stock = live?.[p0.code] ? { ...p0.stock, ...live[p0.code] } : p0.stock;
    const inStock = Object.entries(stock).filter(([, q]) => q > 0);
    const total = inStock.reduce((a, [, q]) => a + q, 0);
    // odprodaja zadnje velikosti po živi zalogi (samo moške boksarice)
    const sale = !p0.outlet && (p0.group === "boksarice" || p0.group === "kopalke") && inStock.length === 1;
    const p = { ...p0, sale, effPrice: p0.outlet ? p0.effPrice : sale ? +(p0.price * 0.7).toFixed(2) : p0.promo15 ? +(p0.price * 0.85).toFixed(2) : p0.price };
    const kids = p.gender === "otroci";
    const desc = strip(p.description || defaultDescription(p, t)) || title(p);
    const extra = p.images.slice(1, 10).map((im) => `<g:additional_image_link>${esc(im.src)}</g:additional_image_link>`).join("");
    const label = p.outlet ? "vse-more-ven" : sale ? "odprodaja" : p.collection === "limited" ? "limited" : "redno";
    items.push(`<item>
<g:id>${esc(p.code)}</g:id>
<g:title>${esc(title(p))}</g:title>
<g:description>${esc(desc.slice(0, 4900))}</g:description>
<g:link>${esc(`${base}/sl/p/${p.slug}`)}</g:link>
<g:image_link>${esc(p.img)}</g:image_link>${extra}
<g:availability>${total > 0 ? "in_stock" : "out_of_stock"}</g:availability>
<g:quantity_to_sell_on_facebook>${Math.max(0, total)}</g:quantity_to_sell_on_facebook>
<g:price>${money(p.price)}</g:price>${p.effPrice < p.price ? `\n<g:sale_price>${money(p.effPrice)}</g:sale_price>` : ""}
<g:brand>69SLAM</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:gender>${p.gender === "zenske" ? "female" : kids ? "unisex" : "male"}</g:gender>
<g:age_group>${kids ? "kids" : "adult"}</g:age_group>
<g:color>večbarvna</g:color>
<g:size>${esc(inStock.map(([s]) => s).join(", ") || p.sizes.join(", "))}</g:size>
<g:google_product_category>${esc(CATEGORY[p.group] || CATEGORY.oblacila)}</g:google_product_category>
<g:product_type>${esc(`${GROUP_SL[p.group] || "Ostalo"}${p.material ? " > " + p.material : ""}`)}</g:product_type>
<g:custom_label_0>${esc(p.group)}</g:custom_label_0>
<g:custom_label_1>${label}</g:custom_label_1>
<g:custom_label_2>${p.bundleable && !sale ? "paket3" : "ne-paket3"}</g:custom_label_2>
</item>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>69SLAM.si</title>
<link>${esc(base)}</link>
<description>Uradna 69SLAM spletna trgovina — moško spodnje perilo in kopalke.</description>
${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
