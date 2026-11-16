import crypto from "node:crypto";
import { db, ensureSchema, catalogMeta } from "./db";

/** Inventura s tablice (Katarina): vnosi štetja — zaloge NE spreminjajo, dokler admin ne potrdi. */
export const INV_COOKIE = "inv69";

let _ready = null;
export function ensureInvSchema() {
  if (!_ready) {
    _ready = (async () => {
      await ensureSchema();
      const sql = db();
      await sql`CREATE TABLE IF NOT EXISTS inv_counts (
        id BIGSERIAL PRIMARY KEY,
        cid TEXT UNIQUE NOT NULL,
        sku TEXT NOT NULL,
        code TEXT,
        size TEXT,
        qty INT NOT NULL,
        manual BOOLEAN NOT NULL DEFAULT false,
        note TEXT,
        deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at TIMESTAMPTZ
      )`;
      await sql`CREATE INDEX IF NOT EXISTS inv_counts_open ON inv_counts (closed_at)`;
    })().catch((e) => { _ready = null; throw e; });
  }
  return _ready;
}

/* ---------- PIN ---------- */
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
export function pinHash(pin) {
  return hash(`${pin}::69slam-inventura::${process.env.ADMIN_PASSWORD || ""}`);
}
/** Žeton v piškotku = izpeljan iz shranjenega PIN-a → ob spremembi PIN-a se vse tablice odjavijo. */
export function tokenFor(storedHash) {
  return hash(`${storedHash}::tok`);
}
export async function getPinHash() {
  const sql = db();
  const [r] = await sql`SELECT value FROM settings WHERE key = 'inventura_pin'`;
  return r?.value?.hash || null;
}
export async function setPin(pin) {
  const sql = db();
  const v = { hash: pinHash(pin), set_at: new Date().toISOString() };
  await sql`INSERT INTO settings (key, value) VALUES ('inventura_pin', ${JSON.stringify(v)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}
export async function isInvAuthed(req) {
  const h = await getPinHash();
  if (!h) return false;
  const c = req.cookies.get(INV_COOKIE)?.value || "";
  return c === tokenFor(h);
}

/** Zaščita pred ugibanjem PIN-a: po 8 napačnih poskusih zaklep za 15 minut. */
export async function checkLock() {
  const sql = db();
  const [r] = await sql`SELECT value FROM settings WHERE key = 'inventura_lock'`;
  const v = r?.value || { fails: 0, until: 0 };
  return v;
}
export async function saveLock(v) {
  const sql = db();
  await sql`INSERT INTO settings (key, value) VALUES ('inventura_lock', ${JSON.stringify(v)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}

/* ---------- podatki ---------- */
const norm = (s) => String(s || "").trim();

/** Vsi artikli glavnega skladišča (vse velikosti), z vrsto za filter. */
export async function invArticles() {
  const sql = db();
  const rows = await sql`SELECT v.sku, v.code, v.size, v.stock, p.name, e.type_sl
    FROM variants v JOIN products p ON p.code = v.code
    LEFT JOIN product_edits e ON e.code = v.code`;
  const imgs = await sql`SELECT DISTINCT ON (code) code, url FROM product_images ORDER BY code, pos`;
  const dbImg = Object.fromEntries(imgs.map((i) => [i.code, i.url]));
  const meta = catalogMeta();
  return rows.map((r) => {
    const m = meta[r.code] || {};
    const type = norm(r.type_sl || m.type);
    return {
      sku: r.sku, code: r.code, size: r.size, stock: r.stock, name: r.name,
      type, kind: (type.split(" · ")[0] || "").trim() || "Ostalo",
      img: dbImg[r.code] || m.img || null,
    };
  });
}

export async function openEntries() {
  const sql = db();
  return sql`SELECT cid, sku, code, size, qty, manual, note, deleted, created_at, updated_at
    FROM inv_counts WHERE closed_at IS NULL ORDER BY created_at`;
}

/** Shrani (ali posodobi) vnose s tablice. Vsak vnos ima svoj cid, zato ponovno pošiljanje ne podvaja. */
export async function upsertEntries(list) {
  const clean = [];
  for (const e of Array.isArray(list) ? list : []) {
    const cid = norm(e?.cid).slice(0, 64);
    const sku = norm(e?.sku).toUpperCase().slice(0, 64);
    const qty = parseInt(e?.qty, 10);
    if (!cid || !sku || !Number.isFinite(qty) || qty < 0 || qty > 100000) continue;
    clean.push({
      cid, sku, qty,
      code: norm(e.code).slice(0, 64) || null,
      size: norm(e.size).slice(0, 20) || null,
      manual: Boolean(e.manual),
      note: norm(e.note).slice(0, 300) || null,
      deleted: Boolean(e.deleted),
      at: Number.isFinite(Date.parse(e.at)) ? new Date(e.at).toISOString() : new Date().toISOString(),
    });
  }
  if (!clean.length) return 0;
  const sql = db();
  const C = (k) => clean.map((x) => x[k]);
  await sql`INSERT INTO inv_counts (cid, sku, code, size, qty, manual, note, deleted, created_at)
    SELECT * FROM unnest(${C("cid")}::text[], ${C("sku")}::text[], ${C("code")}::text[], ${C("size")}::text[],
      ${C("qty")}::int[], ${C("manual")}::boolean[], ${C("note")}::text[], ${C("deleted")}::boolean[], ${C("at")}::timestamptz[])
    ON CONFLICT (cid) DO UPDATE SET qty = EXCLUDED.qty, note = EXCLUDED.note, deleted = EXCLUDED.deleted, updated_at = now()
    WHERE inv_counts.closed_at IS NULL`;
  return clean.length;
}
