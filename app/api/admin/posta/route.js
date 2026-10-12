import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { postaConfigured, postaSend, postaStatus } from "../../../../lib/posta";
import { markShipped } from "../../../../lib/ship";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pošlje naročila v portal Pošte (oddaj.mojpaket.si).
 * { ids: [1, 2, …], again?: true } — že poslana naročila preskoči, razen z again.
 */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  if (!postaConfigured()) return NextResponse.json({ ok: false, message: "Žeton Pošte (POSTA_TOKEN) ni nastavljen v Vercelu." }, { status: 500 });
  await ensureSchema();
  const sql = db();
  const body = await req.json().catch(() => ({}));
  const ids = (Array.isArray(body.ids) ? body.ids : [body.id]).map(Number).filter(Boolean).slice(0, 50);
  if (!ids.length) return NextResponse.json({ ok: false, message: "Ni izbranih naročil." }, { status: 400 });
  const orders = await sql`SELECT * FROM orders WHERE id = ANY(${ids}) ORDER BY number`;
  const results = [];
  for (const o of orders) {
    if (o.source === "shopify") { results.push({ id: Number(o.id), number: Number(o.number), ok: false, message: "Shopify naročilo — preskočeno." }); continue; }
    if (o.status === "preklicano") { results.push({ id: Number(o.id), number: Number(o.number), ok: false, message: "Preklicano — preskočeno." }); continue; }
    if (o.posta_sent_at && !body.again) { results.push({ id: Number(o.id), number: Number(o.number), ok: true, skipped: true, message: "Že v portalu." }); continue; }
    const r = await postaSend(o);
    if (r.ok)
      await sql`UPDATE orders SET posta_sent_at = now(), posta_ref = ${JSON.stringify(r.ref)}::jsonb,
        posta_status = ${r.message || "Poslano v portal."}, posta_checked_at = NULL WHERE id = ${o.id}`;
    results.push({ id: Number(o.id), number: Number(o.number), ok: r.ok, message: r.message });
  }
  const sent = results.filter((r) => r.ok && !r.skipped).length;
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({
    ok: failed.length === 0,
    sent,
    results,
    message: (sent ? `📮 ${sent} ${sent === 1 ? "naročilo poslano" : "naročil poslanih"} v portal Pošte.` : "Nič novega ni bilo poslano.")
      + (failed.length ? ` ⚠️ Ni uspelo: ${failed.map((f) => `#${f.number} (${f.message})`).join(", ")}` : ""),
  });
}

/** Preveri stanje enega naročila v portalu takoj (?id=…). Če je sledilna številka že dodeljena, naročilo označi kot »Poslano«. */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  await ensureSchema();
  const sql = db();
  const qp = new URL(req.url).searchParams;
  const id = Number(qp.get("id"));
  const [o] = await sql`SELECT id, number, status, created_at, posta_ref, posta_sent_at FROM orders WHERE id = ${id}`;
  if (!o) return NextResponse.json({ ok: false, message: "Naročilo ne obstaja." }, { status: 404 });
  if (qp.get("diag")) {
    const { postaDiag, postaRef } = await import("../../../../lib/posta");
    const r = postaRef(o);
    const d = r.date;
    const vars = [r, { id: r.id, date: d.slice(0, 16) }, { id: r.id, date: d.slice(0, 10) }, { id: r.id, date: d.replace(" ", "T") },
      { id: "#" + r.id, date: d }, { id: "999999", date: d }];
    return NextResponse.json({ ref: o.posta_ref, created_at: o.created_at, sent: o.posta_sent_at, results: await postaDiag(o, vars) });
  }
  const st = await postaStatus(o);
  await sql`UPDATE orders SET posta_checked_at = now(), posta_status = ${st.text || null} WHERE id = ${id}`;
  let shipped = null;
  if (st.ok && st.tracking && ["novo", "placano"].includes(o.status)) shipped = await markShipped(id, st.tracking);
  return NextResponse.json({ ok: st.ok, tracking: st.tracking || null, text: st.text, raw: st.raw, shipped });
}
