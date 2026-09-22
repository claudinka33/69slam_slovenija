import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

/** Povezava na Neon Postgres (DATABASE_URL nastavi Vercel-Neon integracija). */
export function db() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("NO_DATABASE_URL");
  return neon(url);
}

export function dbConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

/** Ustvari tabele, če še ne obstajajo (varno klicati večkrat). */
export async function ensureSchema() {
  const sql = db();
  await sql`CREATE TABLE IF NOT EXISTS products (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    collection TEXT NOT NULL DEFAULT 'core',
    price_cents INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true
  )`;
  await sql`CREATE TABLE IF NOT EXISTS variants (
    sku TEXT PRIMARY KEY,
    code TEXT NOT NULL REFERENCES products(code) ON DELETE CASCADE,
    size TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0
  )`;
  await sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001`;
  await sql`CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    number BIGINT NOT NULL DEFAULT nextval('order_number_seq'),
    status TEXT NOT NULL DEFAULT 'novo',
    payment TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    zip TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'SI',
    lang TEXT NOT NULL DEFAULT 'sl',
    subtotal_cents INT NOT NULL,
    shipping_cents INT NOT NULL DEFAULT 0,
    cod_fee_cents INT NOT NULL DEFAULT 0,
    total_cents INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    qty INT NOT NULL,
    price_cents INT NOT NULL,
    bundle_key TEXT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS stock_moves (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT NOT NULL,
    delta INT NOT NULL,
    reason TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS subscribers (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    lang TEXT NOT NULL DEFAULT 'sl',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    percent INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ
  )`;
}

/** Uvozi katalog (data/catalog.json) v bazo. Zalogo nastavi SAMO variantam, ki jih še ni. */
export async function seedFromCatalog() {
  const sql = db();
  await ensureSchema();
  const raw = fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8");
  const catalog = JSON.parse(raw);
  let newProducts = 0, newVariants = 0;
  for (const p of catalog.products) {
    await sql`INSERT INTO products (code, name, slug, collection, price_cents, active)
      VALUES (${p.code}, ${p.name}, ${p.slug}, ${p.collection}, ${Math.round(p.price * 100)}, ${p.status === "ACTIVE"})
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug,
        collection = EXCLUDED.collection, price_cents = EXCLUDED.price_cents, active = EXCLUDED.active`;
    newProducts++;
    for (const v of p.variants) {
      const sku = v.sku_clean || `${p.code}-${v.size}`;
      const r = await sql`INSERT INTO variants (sku, code, size, stock)
        VALUES (${sku}, ${p.code}, ${v.size}, ${v.stock_snapshot || 0})
        ON CONFLICT (sku) DO NOTHING RETURNING sku`;
      if (r.length) {
        newVariants++;
        if ((v.stock_snapshot || 0) !== 0)
          await sql`INSERT INTO stock_moves (sku, delta, reason, note)
            VALUES (${sku}, ${v.stock_snapshot || 0}, 'uvoz', 'Začetni uvoz iz Shopify izvoza')`;
      }
    }
  }
  return { products: newProducts, newVariants };
}

/** Živa zaloga: { CODE: { SIZE: qty } } */
export async function getStockMap() {
  const sql = db();
  const rows = await sql`SELECT code, size, stock FROM variants`;
  const map = {};
  for (const r of rows) {
    map[r.code] = map[r.code] || {};
    map[r.code][r.size] = r.stock;
  }
  return map;
}
