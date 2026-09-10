import { getProducts } from "../lib/catalog";
import { LANGS } from "../lib/i18n";

export default function sitemap() {
  const base = "https://69slam.si";
  const now = new Date();
  const urls = LANGS.map((l) => ({ url: `${base}/${l}`, lastModified: now, priority: 1 }));
  for (const p of getProducts())
    for (const l of LANGS)
      urls.push({ url: `${base}/${l}/p/${p.slug}`, lastModified: now, priority: 0.8 });
  return urls;
}
