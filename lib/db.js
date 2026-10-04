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
  // izvor naročila (web / shopify) + zunanji ID za uvoz brez podvajanja
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web'`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_id TEXT`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_external_id_uq ON orders (external_id)`;
  // plačila (Stripe)
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS mailed_at TIMESTAMPTZ`;
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
  // stranke, uvožene iz Shopifyja (izvoz CSV) — skupno število naročil in porabe iz Shopifyja
  await sql`CREATE TABLE IF NOT EXISTS shop_customers (
    email TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    city TEXT,
    orders_count INT NOT NULL DEFAULT 0,
    total_cents INT NOT NULL DEFAULT 0,
    accepts_marketing BOOLEAN NOT NULL DEFAULT false,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS address TEXT`;
  await sql`ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS zip TEXT`;
  await sql`ALTER TABLE shop_customers ADD COLUMN IF NOT EXISTS country TEXT`;
  // nabavne cene (brez DDV) + prevzemi blaga
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_cents INT`;
  await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_cents INT`;
  await sql`CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1`;
  await sql`CREATE TABLE IF NOT EXISTS receipts (
    id BIGSERIAL PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier TEXT NOT NULL DEFAULT '',
    doc_ref TEXT,
    note TEXT,
    total_cents INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS receipt_items (
    id BIGSERIAL PRIMARY KEY,
    receipt_id BIGINT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    qty INT NOT NULL,
    cost_cents INT NOT NULL
  )`;
  // slike artiklov, ki niso iz Shopifyja (Vercel Blob)
  await sql`CREATE TABLE IF NOT EXISTS product_images (
    code TEXT NOT NULL,
    pos INT NOT NULL,
    url TEXT NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (code, pos)
  )`;
  // urejanja artiklov v CMS (prednost pred katalogom)
  await sql`CREATE TABLE IF NOT EXISTS product_edits (
    code TEXT PRIMARY KEY,
    name TEXT,
    type_sl TEXT,
    description TEXT,
    price_cents INT,
    published BOOLEAN,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS coupons (
    id BIGSERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    percent INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ
  )`;
  // e-mail marketing: odjava, opomniki, ocene, kampanje
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`;
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS source TEXT`;
  await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS name TEXT`;
  await sql`CREATE TABLE IF NOT EXISTS mail_jobs (
    id BIGSERIAL PRIMARY KEY,
    kind TEXT NOT NULL,
    ref_id BIGINT,
    email TEXT,
    send_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'cakajoce',
    info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS mail_jobs_uq ON mail_jobs (kind, ref_id)`;
  await sql`CREATE TABLE IF NOT EXISTS carts (
    id BIGSERIAL PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'sl',
    cart JSONB NOT NULL,
    total_cents INT NOT NULL DEFAULT 0,
    recovered_order BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    rating INT NOT NULL,
    title TEXT,
    body TEXT,
    status TEXT NOT NULL DEFAULT 'caka',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_code_uq ON reviews (order_id, code)`;
  await sql`CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    subject TEXT NOT NULL DEFAULT '',
    preheader TEXT,
    blocks JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'osnutek',
    sent_count INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL)`;
  // računi (izdani v CMS ali iz spletnih naročil)
  await sql`CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    number TEXT UNIQUE NOT NULL,
    year INT NOT NULL,
    seq INT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'racun',
    ref_number TEXT,
    order_id BIGINT,
    status TEXT NOT NULL DEFAULT 'izdan',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    service_date DATE,
    due_date DATE,
    place TEXT,
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_zip_city TEXT,
    customer_country TEXT,
    customer_vat TEXT,
    customer_email TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    prices_gross BOOLEAN NOT NULL DEFAULT false,
    payment TEXT,
    notes TEXT,
    net_cents INT NOT NULL DEFAULT 0,
    vat_cents INT NOT NULL DEFAULT 0,
    total_cents INT NOT NULL DEFAULT 0,
    prepared_by TEXT,
    paid_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    sent_to TEXT,
    UNIQUE (year, seq)
  )`;
  // dokumenti: serija (R = računi+dobropisi, PR = predračuni, DOB = dobavnice), povezave med dokumenti
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS series TEXT NOT NULL DEFAULT 'R'`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_id BIGINT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS converted_to TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tracking TEXT`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pay_ref TEXT`;
  await sql`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_year_seq_key`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS invoices_series_year_seq ON invoices (series, year, seq)`;
  // zgodovina rednih cen (za prikaz najnižje cene v zadnjih 30 dneh)
  await sql`CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    price_cents INT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS price_history_code ON price_history (code, changed_at)`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'sl'`;
  await sql`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS error TEXT`;
  await sql`CREATE TABLE IF NOT EXISTS campaign_sends (
    campaign_id BIGINT NOT NULL,
    email TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (campaign_id, email)
  )`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_cents INT NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS once_per_email BOOLEAN NOT NULL DEFAULT false`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses INT`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS note TEXT`;
  await sql`ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents INT NOT NULL DEFAULT 0`;
  // merjenje oglasov (Meta Conversions API) — samo ob privolitvi
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ad_meta TEXT`;
}

/** Uvozi katalog (data/catalog.json) v bazo. Zalogo nastavi SAMO variantam, ki jih še ni.
 *  Vse v nekaj množičnih poizvedbah (hitro tudi za več sto izdelkov). */
export async function seedFromCatalog() {
  const sql = db();
  await ensureSchema();
  const raw = fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8");
  const catalog = JSON.parse(raw);
  const P = catalog.products;
  // zgodovina cen: artikli, ki jim katalog spremeni redno ceno (in nimajo cene iz CMS)
  await sql`INSERT INTO price_history (code, price_cents)
    SELECT pr.code, pr.price_cents FROM products pr
    JOIN unnest(${P.map((p) => p.code)}::text[], ${P.map((p) => Math.round(p.price * 100))}::int[]) AS c(code, cents) ON c.code = pr.code
    LEFT JOIN product_edits e ON e.code = pr.code
    WHERE pr.price_cents IS NOT NULL AND pr.price_cents <> c.cents AND e.price_cents IS NULL`;
  await sql`INSERT INTO products (code, name, slug, collection, price_cents, active)
    SELECT * FROM unnest(
      ${P.map((p) => p.code)}::text[], ${P.map((p) => p.name)}::text[], ${P.map((p) => p.slug)}::text[],
      ${P.map((p) => p.collection || "core")}::text[], ${P.map((p) => Math.round(p.price * 100))}::int[],
      ${P.map((p) => p.status === "ACTIVE")}::boolean[])
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug,
      collection = EXCLUDED.collection, price_cents = EXCLUDED.price_cents, active = EXCLUDED.active`;
  const V = [];
  for (const p of P)
    for (const v of p.variants)
      V.push({ sku: v.sku_clean || `${p.code}-${String(v.size).replace(/\s+/g, "")}`, code: p.code, size: v.size, stock: Math.max(0, v.stock_snapshot || 0) });
  const inserted = await sql`INSERT INTO variants (sku, code, size, stock)
    SELECT * FROM unnest(${V.map((v) => v.sku)}::text[], ${V.map((v) => v.code)}::text[],
      ${V.map((v) => v.size)}::text[], ${V.map((v) => v.stock)}::int[])
    ON CONFLICT (sku) DO NOTHING RETURNING sku, stock`;
  const moves = inserted.filter((r) => r.stock !== 0);
  if (moves.length)
    await sql`INSERT INTO stock_moves (sku, delta, reason, note)
      SELECT sku, delta, 'uvoz', 'Začetni uvoz iz Shopifyja' FROM unnest(
        ${moves.map((m) => m.sku)}::text[], ${moves.map((m) => m.stock)}::int[]) AS t(sku, delta)`;
  // artikli iz Metakocke s slikami in ceno so na spletu (enako pravilo kot lib/catalog.js)
  const MK = P.filter((p) => p.source === "metakocka" && p.price > 0 && p.group !== "embalaza").map((p) => p.code);
  if (MK.length)
    await sql`UPDATE products SET active = true
      WHERE code = ANY(${MK}::text[]) AND code IN (SELECT DISTINCT code FROM product_images)`;
  // ročna urejanja iz CMS imajo prednost pred katalogom
  await sql`UPDATE products p SET name = COALESCE(e.name, p.name), price_cents = COALESCE(e.price_cents, p.price_cents),
      active = COALESCE(e.published, p.active)
    FROM product_edits e WHERE e.code = p.code`;
  // nabavne cene iz Metakocke (samo kjer še niso vpisane)
  const C = P.filter((p) => p.cost_eur > 0);
  if (C.length)
    await sql`UPDATE products p SET cost_cents = c.cost FROM unnest(
        ${C.map((p) => p.code)}::text[], ${C.map((p) => Math.round(p.cost_eur * 100))}::int[]) AS c(code, cost)
      WHERE p.code = c.code AND p.cost_cents IS NULL`;
  // izdelki, ki so bili odstranjeni iz kataloga → izbriši iz baze (zalogo zapiši v dnevnik)
  const codes = P.map((p) => p.code);
  const gone = await sql`SELECT sku, stock FROM variants WHERE code <> ALL(${codes}::text[]) AND stock <> 0`;
  if (gone.length)
    await sql`INSERT INTO stock_moves (sku, delta, reason, note)
      SELECT sku, -stock, 'rocno', 'Izdelek odstranjen iz kataloga' FROM unnest(
        ${gone.map((g) => g.sku)}::text[], ${gone.map((g) => g.stock)}::int[]) AS t(sku, stock)`;
  const removed = await sql`DELETE FROM products WHERE code <> ALL(${codes}::text[]) RETURNING code`;
  return { products: P.length, newVariants: inserted.length, removed: removed.length };
}

/** Za admin: { CODE: { img, category } } iz kataloga (sličica + skupina). */
let _meta = null;
export function catalogMeta() {
  if (_meta) return _meta;
  const raw = fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8");
  const catalog = JSON.parse(raw);
  _meta = {};
  for (const p of catalog.products) {
    const main = p.images?.find((i) => i.role === "main") || p.images?.[0];
    let img = null;
    if (main?.src_url) img = main.src_url.includes("cdn.shopify.com")
      ? `${main.src_url}&width=120${/\.heic(\?|$)/i.test(main.src_url) ? "&format=jpg" : ""}` : main.src_url;
    const gender = p.gender || "moski";
    const group = p.group || "boksarice";
    _meta[p.code] = { img, gender, group, type: p.type_sl || null, material: p.material || null,
      category: group === "kopalke" ? "kopalke" : group === "boksarice" ? "boksarice" : group };
  }
  return _meta;
}

/** Skupina izdelka: "kopalke" ali "boksarice". */
export function productCategory(p) {
  const t = `${p.type || ""} ${p.category || ""} ${p.name || ""} ${p.collection || ""}`.toLowerCase();
  if (/kopal|swim|boardshort/.test(t) || /^SS/.test(p.code || "")) return "kopalke";
  return "boksarice";
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
