// Pred buildom prenese logotip in favicon s Shopify CDN.
// Fail-soft: ce prenos ne uspe, build vseeno tece naprej.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const ASSETS = [
  {
    url: "https://cdn.shopify.com/s/files/1/0778/4018/7715/files/Logo_69slam_BEL.png?v=1764756018",
    out: "public/logo.png",
  },
  {
    url: "https://cdn.shopify.com/s/files/1/0778/4018/7715/files/logo_69slam_slo_100.png?v=1695290031&width=512",
    out: "app/icon.png",
  },
];

async function fetchWithTimeout(url, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

for (const asset of ASSETS) {
  try {
    const res = await fetchWithTimeout(asset.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error("prazna datoteka");
    await mkdir(dirname(asset.out), { recursive: true });
    await writeFile(asset.out, buf);
    console.log(`[prepare-assets] OK  ${asset.out} (${buf.length} B)`);
  } catch (err) {
    console.warn(`[prepare-assets] PRESKOCENO ${asset.out}: ${err.message}`);
  }
}

// Slike artiklov iz baze (Vercel Blob, naložene iz OneDriva) → data/db-images.json
// Fail-soft: brez baze ostane prazna datoteka in trgovina deluje kot prej.
try {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let map = {};
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const rows = await sql`SELECT code, url FROM product_images ORDER BY code, pos`;
    for (const r of rows) (map[r.code] = map[r.code] || []).push(r.url);
  }
  await writeFile("data/db-images.json", JSON.stringify(map));
  console.log(`[prepare-assets] OK  data/db-images.json (${Object.keys(map).length} artiklov)`);
} catch (err) {
  await writeFile("data/db-images.json", "{}").catch(() => {});
  console.warn(`[prepare-assets] slike iz baze PRESKOCENO: ${err.message}`);
}
