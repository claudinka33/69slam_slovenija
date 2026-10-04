import { unstable_cache } from "next/cache";
import { db, dbConfigured } from "./db";

/** Urejanja artiklov iz CMS (naslov, opis, cena, objava, slike). Predpomnjeno, osveži se z revalidateTag("catalog"). */
export const loadOverrides = unstable_cache(async () => {
  const out = { edits: {}, images: {}, low30: {} };
  if (!dbConfigured()) return out;
  try {
    const sql = db();
    const [edits, imgs, low] = await Promise.all([
      sql`SELECT code, name, type_sl, description, price_cents, published FROM product_edits`,
      sql`SELECT code, url FROM product_images ORDER BY code, pos`,
      sql`SELECT code, MIN(price_cents)::int AS m FROM price_history WHERE changed_at > now() - interval '30 days' GROUP BY code`.catch(() => []),
    ]);
    for (const l of low) out.low30[l.code] = l.m;
    for (const e of edits) out.edits[e.code] = e;
    for (const i of imgs) (out.images[i.code] = out.images[i.code] || []).push(i.url);
  } catch {
    // tabela še ne obstaja ali baza ni dosegljiva → trgovina deluje iz kataloga
  }
  return out;
}, ["catalog-overrides-v2"], { tags: ["catalog"] });
