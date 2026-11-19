import { NextResponse } from "next/server";
import { db, dbConfigured } from "../../../../lib/db";
import { ensureInvSchema, getPinHash, setPin, openEntries } from "../../../../lib/inventura";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      manual.push({ cid: r.cid, sku: r.sku, size: r.size, qty: r.qty, note: r.note, at: r.created_at, known: known.has(r.sku),
        code, product: code ? prods[code] : null, canCreate: Boolean(code && r.size) });
    }
  }
  const [ps] = await sql`SELECT value FROM settings WHERE key = 'inventura_pin'`;
  return NextResponse.json({
    ok: true, pinSet: Boolean(await getPinHash()), pinSetAt: ps?.value?.set_at || null,
    entries: rows.length, sums, manual, last,
  });
}

/** { action: "pin", pin } | { action: "close", before } | { action: "resolve", cid } (zaključi štetje — vnosi se arhivirajo, tablica začne na novo) */
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
  if (body.action === "resolve") {
    // ročni vnos pregledan → odstrani s seznama (in s tablice)
    const sql = db();
    await sql`UPDATE inv_counts SET closed_at = now() WHERE cid = ${String(body.cid || "")} AND closed_at IS NULL`;
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
}
