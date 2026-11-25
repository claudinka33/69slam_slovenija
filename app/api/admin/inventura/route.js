import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { db, dbConfigured, prefixMeta } from "../../../../lib/db";
import { ensureInvSchema, getPinHash, setPin, openEntries } from "../../../../lib/inventura";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Šifra artikla iz ročnega vnosa (»SLLSY-PO S« → SLLSY, »MWSHB-M« z velikostjo M → MWSHB). */
function baseCode(sku, size) {
  let s = String(sku || "").toUpperCase().replace(/\s+/g, " ").trim();
  const lab = s.match(/^([A-Z0-9]{4,10})-([A-Z]{2})(?:\s+\S+)?$/);
  if (lab) return lab[1].slice(3, 6) === "PLN" && lab[1].length === 6 ? lab[1] + lab[2] : lab[1];
  s = s.replace(/\s+/g, "");
  const z = String(size || "").replace(/\s+/g, "").toUpperCase();
  if (z && s.endsWith(`-${z}`)) s = s.slice(0, -z.length - 1);
  return s.replace(/-/g, "");
}
let _mk = null;
function mkCost(code) {
  if (!_mk) { try { _mk = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/mk-costs.json"), "utf8")); } catch { _mk = { codes: {}, prefix: {} }; } }
  const v = _mk.codes?.[code] ?? _mk.prefix?.[code.slice(0, 3)];
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v) * 100) : null;
}
/** Predlog za nov artikel: vrsta in cena po artiklih z istimi prvimi 3 črkami. */
async function suggestFor(sql, code) {
  const pre = code.slice(0, 3);
  const sib = await sql`SELECT price_cents, COUNT(*)::int AS n FROM products WHERE code LIKE ${pre + "%"} GROUP BY price_cents ORDER BY n DESC LIMIT 1`;
  const pm = prefixMeta(code);
  // ime vzorca: zadnje 3 črke šifre (DOF, HPE, CAB …) imajo isti vzorec tudi pri drugih artiklih
  let name = "";
  if (code.length >= 6) {
    const des = code.slice(3, 6);
    const COL = { BK: "BLACK", WH: "WHITE", NV: "NAVY", RD: "RED", GR: "GREY", DG: "DARK GREY", AG: "AQUA GREEN", BL: "BLUE" };
    if (des === "PLN") name = COL[code.slice(6, 8)] ? `PLAIN ${COL[code.slice(6, 8)]}` : "";
    else {
      const r = await sql`SELECT name, COUNT(*)::int AS n FROM products WHERE substr(code, 4, 3) = ${des} GROUP BY name ORDER BY n DESC LIMIT 1`;
      name = r[0]?.name || "";
    }
  }
  return { code, name, type: pm?.type || "", price_cents: sib[0]?.price_cents ?? null, cost_cents: mkCost(code) };
}

/** Admin: pregled štetja s tablice (seštevki po SKU + ročni vnosi neznanih šifer). */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." });
  await ensureInvSchema();
  const sql = db();
  const rows = (await openEntries()).filter((r) => !r.deleted);
  const known = new Set((await sql`SELECT sku FROM variants`).map((r) => r.sku));
  const prods = Object.fromEntries((await sql`SELECT code, name FROM products`).map((p) => [p.code, p.name]));
  const sums = {};
  const manual = [];
  let last = null;
  for (const r of rows) {
    if (!last || new Date(r.updated_at) > new Date(last)) last = r.updated_at;
    if (!r.manual && known.has(r.sku)) sums[r.sku] = (sums[r.sku] || 0) + r.qty;
    else {
      const code = r.code && prods[r.code] ? r.code : prods[r.sku] ? r.sku : null;
      manual.push({ cid: r.cid, sku: r.sku, size: r.size, qty: r.qty, note: r.note, name: r.name, at: r.created_at, known: known.has(r.sku),
        code, product: code ? prods[code] : null, canCreate: Boolean(code && r.size),
        suggest: code ? null : await suggestFor(sql, baseCode(r.sku, r.size)) });
    }
  }
  const [ps] = await sql`SELECT value FROM settings WHERE key = 'inventura_pin'`;
  // ročni vnosi, ki so bili skriti z »✓ Urejeno« (zadnjih 60 dni) — da jih lahko vrneš
  const hidden = await sql`SELECT cid, sku, size, qty, note, name, created_at AS at, closed_at FROM inv_counts
    WHERE manual = true AND deleted = false AND closed_at IS NOT NULL AND closed_at > now() - interval '60 days'
    ORDER BY closed_at DESC LIMIT 100`;
  return NextResponse.json({
    ok: true, pinSet: Boolean(await getPinHash()), pinSetAt: ps?.value?.set_at || null,
    entries: rows.length, sums, manual, hidden, last,
  });
}

/** { action: "pin", pin } | { action: "close", before } | { action: "resolve" | "unresolve", cid } | { action: "edit", cid, sku, size } (zaključi štetje — vnosi se arhivirajo, tablica začne na novo) */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureInvSchema();
  const body = await req.json().catch(() => ({}));
  if (body.action === "pin") {
    const pin = String(body.pin || "");
    if (!/^\d{4,8}$/.test(pin)) return NextResponse.json({ ok: false, message: "PIN mora imeti 4–8 številk." }, { status: 400 });
    await setPin(pin);
    return NextResponse.json({ ok: true, message: "✓ PIN shranjen. Tablica se prijavi z novim PIN-om." });
  }
  if (body.action === "close") {
    const sql = db();
    // zaključi samo vnose, ki so bili preneseni v tabelo (novejši ostanejo odprti na tablici)
    const before = Number.isFinite(Date.parse(body.before)) ? new Date(body.before).toISOString() : new Date().toISOString();
    const r = await sql`UPDATE inv_counts SET closed_at = now()
      WHERE closed_at IS NULL AND manual = false AND created_at <= ${before}::timestamptz AND updated_at <= ${before}::timestamptz RETURNING id`;
    return NextResponse.json({ ok: true, closed: r.length });
  }
  if (body.action === "create_size") {
    // nova velikost obstoječega artikla (npr. AGSALS-44): ustvari jo z zalogo 0 in vnos prenese v štetje
    const sql = db();
    const rows = body.all
      ? await sql`SELECT * FROM inv_counts WHERE closed_at IS NULL AND manual = true AND deleted = false`
      : await sql`SELECT * FROM inv_counts WHERE cid = ${String(body.cid || "")} AND closed_at IS NULL`;
    const prods = new Set((await sql`SELECT code FROM products`).map((p) => p.code));
    let made = 0;
    for (const r of rows) {
      const code = r.code && prods.has(r.code) ? r.code : prods.has(r.sku) ? r.sku : null;
      const size = String(r.size || "").replace(/\s+/g, "").toUpperCase();
      if (!code || !size) continue;
      const sku = `${code}-${size}`.slice(0, 64);
      const ins = await sql`INSERT INTO variants (sku, code, size, stock) VALUES (${sku}, ${code}, ${size}, 0) ON CONFLICT (sku) DO NOTHING RETURNING sku`;
      if (ins.length) made++;
      await sql`UPDATE inv_counts SET sku = ${sku}, code = ${code}, size = ${size}, manual = false, updated_at = now() WHERE cid = ${r.cid}`;
    }
    return NextResponse.json({ ok: true, made, moved: rows.length });
  }
  if (body.action === "create_product") {
    // nov artikel iz ročnega vnosa: skrit v trgovini, zaloga 0, vnos gre v štetje (višek ob potrditvi inventure)
    const sql = db();
    const cid = String(body.cid || "");
    const size = String(body.size || "").replace(/\s+/g, "").toUpperCase().slice(0, 20);
    // šifra z etikete (»MWSHB-XX M«, »SLLSY-PO S«) → samo osnovna šifra artikla
    const code = baseCode(body.code, size).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
    const name = String(body.name || "").trim().toUpperCase().slice(0, 120);
    const type = String(body.type || "").trim().slice(0, 160) || null;
    const price = Math.round(parseFloat(String(body.price ?? "").replace(",", ".")) * 100);
    if (code.length < 4) return NextResponse.json({ ok: false, message: "Šifra artikla mora imeti vsaj 4 znake." }, { status: 400 });
    if (!name) return NextResponse.json({ ok: false, message: "Vpiši ime vzorca." }, { status: 400 });
    if (!size) return NextResponse.json({ ok: false, message: "Vpiši velikost." }, { status: 400 });
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ ok: false, message: "Vpiši prodajno ceno (lahko 0)." }, { status: 400 });
    const slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${code.toLowerCase()}`;
    const cost = mkCost(code);
    await sql`INSERT INTO products (code, name, slug, collection, price_cents, active, cost_cents)
      VALUES (${code}, ${name}, ${slug}, 'core', ${price}, false, ${cost}) ON CONFLICT (code) DO NOTHING`;
    await sql`INSERT INTO product_edits (code, name, type_sl, price_cents, published) VALUES (${code}, ${name}, ${type}, ${price}, false)
      ON CONFLICT (code) DO UPDATE SET type_sl = COALESCE(product_edits.type_sl, EXCLUDED.type_sl)`;
    const sku = `${code}-${size}`;
    await sql`INSERT INTO variants (sku, code, size, stock) VALUES (${sku}, ${code}, ${size}, 0) ON CONFLICT (sku) DO NOTHING`;
    // zaščita: »Uvozi katalog v bazo« tega artikla ne sme izbrisati
    const [cu] = await sql`SELECT value FROM settings WHERE key = 'custom_products'`;
    const list = new Set(cu?.value?.codes || []); list.add(code);
    await sql`INSERT INTO settings (key, value) VALUES ('custom_products', ${JSON.stringify({ codes: [...list] })}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    if (cid) await sql`UPDATE inv_counts SET sku = ${sku}, code = ${code}, size = ${size}, name = ${name}, manual = false, updated_at = now()
      WHERE cid = ${cid} AND closed_at IS NULL`;
    // drugi ročni vnosi z isto šifro → poveži z novim artiklom (ostanejo kot »nova velikost«, če velikost še ne obstaja)
    await sql`UPDATE inv_counts SET code = ${code}, updated_at = now()
      WHERE closed_at IS NULL AND manual = true AND deleted = false AND code IS NULL
        AND (upper(replace(replace(sku, ' ', ''), '-', '')) = ${code} OR sku LIKE ${code + "-%"} OR sku LIKE ${code + " %"})`;
    return NextResponse.json({ ok: true, sku, message: `✓ Ustvarjen artikel ${code} · ${name} (velikost ${size}) — skrit v trgovini, kos je v štetju.` });
  }
  if (body.action === "merge_code") {
    // preimenuj šifro artikla / združi dva artikla v enega (velikosti, zaloga, štetje, zgodovina se prenesejo)
    const sql = db();
    const from = String(body.from || "").trim().toUpperCase();
    const to = String(body.to || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
    if (!from || to.length < 4 || from === to) return NextResponse.json({ ok: false, message: "Neveljavna šifra." }, { status: 400 });
    const [src] = await sql`SELECT * FROM products WHERE code = ${from}`;
    if (!src) return NextResponse.json({ ok: false, message: `Artikla ${from} ni.` }, { status: 404 });
    const [dst] = await sql`SELECT code FROM products WHERE code = ${to}`;
    if (!dst) {
      let slug = String(src.slug).replace(new RegExp(`${from.toLowerCase()}$`), to.toLowerCase());
      if (slug === src.slug) slug = `${slug}-${to.toLowerCase()}`;
      const [taken] = await sql`SELECT 1 FROM products WHERE slug = ${slug}`;
      if (taken) slug = `${slug}-${Date.now().toString(36)}`;
      await sql`INSERT INTO products (code, name, slug, collection, price_cents, active, cost_cents)
        VALUES (${to}, ${src.name}, ${slug}, ${src.collection}, ${src.price_cents}, ${src.active}, ${src.cost_cents})`;
      await sql`INSERT INTO product_edits (code, name, type_sl, description, price_cents, published)
        SELECT ${to}, name, type_sl, description, price_cents, published FROM product_edits WHERE code = ${from}
        ON CONFLICT (code) DO NOTHING`;
    }
    const vars = await sql`SELECT sku, size, stock FROM variants WHERE code = ${from}`;
    for (const v of vars) {
      const nsku = `${to}-${String(v.size).replace(/\s+/g, "").toUpperCase()}`;
      await sql`INSERT INTO variants (sku, code, size, stock) VALUES (${nsku}, ${to}, ${v.size}, ${v.stock})
        ON CONFLICT (sku) DO UPDATE SET stock = variants.stock + EXCLUDED.stock`;
      await sql`UPDATE inv_counts SET sku = ${nsku}, code = ${to} WHERE sku = ${v.sku}`;
      await sql`UPDATE stock_moves SET sku = ${nsku} WHERE sku = ${v.sku}`;
      await sql`DELETE FROM variants WHERE sku = ${v.sku}`;
    }
    await sql`UPDATE inv_counts SET code = ${to} WHERE code = ${from}`;
    await sql`UPDATE product_images SET code = ${to} WHERE code = ${from} AND NOT EXISTS (SELECT 1 FROM product_images x WHERE x.code = ${to})`;
    await sql`DELETE FROM product_edits WHERE code = ${from}`;
    await sql`DELETE FROM products WHERE code = ${from}`;
    const [cu] = await sql`SELECT value FROM settings WHERE key = 'custom_products'`;
    const list = new Set(cu?.value?.codes || []); list.delete(from); list.add(to);
    await sql`INSERT INTO settings (key, value) VALUES ('custom_products', ${JSON.stringify({ codes: [...list] })}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    return NextResponse.json({ ok: true, message: `✓ ${from} → ${to} (${vars.length} velikosti)` });
  }
  if (body.action === "unresolve") {
    // vrni skrit ročni vnos nazaj na seznam za pregled
    const sql = db();
    await sql`UPDATE inv_counts SET closed_at = NULL, updated_at = now() WHERE cid = ${String(body.cid || "")} AND manual = true`;
    return NextResponse.json({ ok: true });
  }
  if (body.action === "edit") {
    // popravi šifro / velikost ročnega vnosa; če šifra obstaja v CMS, vnos poveže z artiklom
    const sql = db();
    const cid = String(body.cid || "");
    let sku = String(body.sku || "").replace(/\s+/g, "").toUpperCase().slice(0, 64);
    let size = String(body.size || "").replace(/\s+/g, "").toUpperCase().slice(0, 20) || null;
    if (!cid || sku.length < 2) return NextResponse.json({ ok: false, message: "Vpiši šifro." }, { status: 400 });
    const prods = new Set((await sql`SELECT code FROM products`).map((p) => p.code));
    let code = null;
    if (prods.has(sku)) { code = sku; if (size) sku = `${code}-${size}`; }
    else {
      const m = sku.match(/^(.+)-([^-]+)$/);
      if (m && prods.has(m[1])) { code = m[1]; size = size || m[2]; sku = `${code}-${size}`; }
    }
    const [v] = await sql`SELECT sku, code, size FROM variants WHERE sku = ${sku}`;
    if (v) { code = v.code; size = v.size; }
    const nm = body.name !== undefined ? (String(body.name || "").trim().toUpperCase().slice(0, 120) || null) : undefined;
    if (nm !== undefined) await sql`UPDATE inv_counts SET name = ${nm} WHERE cid = ${cid} AND closed_at IS NULL`;
    await sql`UPDATE inv_counts SET sku = ${sku}, code = ${code}, size = ${size}, manual = ${!v}, updated_at = now()
      WHERE cid = ${cid} AND closed_at IS NULL`;
    return NextResponse.json({ ok: true, linked: Boolean(v), product: Boolean(code) });
  }
  if (body.action === "resolve") {
    // ročni vnos pregledan → odstrani s seznama (in s tablice)
    const sql = db();
    await sql`UPDATE inv_counts SET closed_at = now() WHERE cid = ${String(body.cid || "")} AND closed_at IS NULL`;
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
}
