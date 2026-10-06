import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { renderCampaign, sendCampaign, campaignPending } from "../../../../lib/marketing";
import { send } from "../../../../lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ADMIN = process.env.MAIL_ADMIN || "69slamslovenia@gmail.com";
const clean = (blocks) => (Array.isArray(blocks) ? blocks : []).slice(0, 40).map((b) => ({
  type: String(b.type), text: b.text != null ? String(b.text).slice(0, 4000) : undefined, url: b.url ? String(b.url).slice(0, 600) : undefined,
  link: b.link ? String(b.link).slice(0, 600) : undefined, codes: Array.isArray(b.codes) ? b.codes.slice(0, 12).map(String) : undefined,
}));

/** Seznam kampanj ali ?id=…&preview=1 (HTML predogled). */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, campaigns: [] });
  await ensureSchema();
  const sql = db();
  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  if (id && u.searchParams.get("preview")) {
    const [c] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!c) return new NextResponse("Ni kampanje.", { status: 404 });
    return new NextResponse(await renderCampaign(c, { email: "primer@email.si", lang: c.lang }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const rows = await sql`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 100`;
  const [s] = await sql`SELECT COUNT(*)::int AS n FROM subscribers WHERE unsubscribed_at IS NULL`;
  for (const r of rows) if (r.status === "v pošiljanju") r.left = await campaignPending(sql, r.id);
  return NextResponse.json({ ok: true, campaigns: rows, subscribers: s.n });
}

/** ?action=upload (telo = slika) | JSON { id?, subject, preheader, title, blocks, lang, action?: "save"|"test"|"send", to? } */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  const sql = db();
  const u = new URL(req.url);
  if (u.searchParams.get("action") === "upload") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false, message: "Vercel Blob ni povezan." }, { status: 503 });
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length < 500 || buf.length > 8 * 1024 * 1024) return NextResponse.json({ ok: false, message: "Slika je prazna ali prevelika (max 8 MB)." }, { status: 400 });
    const type = req.headers.get("content-type") || "image/jpeg";
    const blob = await put(`kampanje/slika.${type.includes("png") ? "png" : type.includes("gif") ? "gif" : "jpg"}`, buf, { access: "public", contentType: type, addRandomSuffix: true });
    return NextResponse.json({ ok: true, url: blob.url });
  }
  const b = await req.json().catch(() => ({}));
  let id = b.id ? Number(b.id) : null;
  if (b.subject !== undefined) {
    const subject = String(b.subject || "").slice(0, 200), pre = b.preheader ? String(b.preheader).slice(0, 200) : null;
    const title = b.title ? String(b.title).slice(0, 120) : null, lang = b.lang === "en" ? "en" : "sl";
    const blocks = JSON.stringify(clean(b.blocks));
    const html = b.html && String(b.html).trim() ? String(b.html).slice(0, 400000) : null;
    if (id) {
      const [c] = await sql`SELECT status FROM campaigns WHERE id = ${id}`;
      if (c && !["osnutek", "načrtovano"].includes(c.status)) return NextResponse.json({ ok: false, message: "Poslane kampanje ni več mogoče urejati — naredi kopijo." }, { status: 400 });
      await sql`UPDATE campaigns SET subject = ${subject}, preheader = ${pre}, title = ${title}, lang = ${lang}, blocks = ${blocks}::jsonb, html = ${html}, updated_at = now() WHERE id = ${id}`;
    } else {
      [{ id }] = await sql`INSERT INTO campaigns (subject, preheader, title, lang, blocks, html) VALUES (${subject}, ${pre}, ${title}, ${lang}, ${blocks}::jsonb, ${html}) RETURNING id`;
    }
  }
  if (b.action === "copy" && id) {
    const [n] = await sql`INSERT INTO campaigns (subject, preheader, title, lang, blocks, html)
      SELECT subject || ' (kopija)', preheader, title, lang, blocks, html FROM campaigns WHERE id = ${id} RETURNING id`;
    return NextResponse.json({ ok: true, id: n.id });
  }
  if (b.action === "test" && id) {
    const [c] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    const to = String(b.to || ADMIN).trim();
    const r = await send({ to, subject: "[TEST] " + c.subject, html: await renderCampaign(c, { email: to, lang: c.lang }) });
    if (r.skipped) return NextResponse.json({ ok: false, id, message: "Resend ni nastavljen (RESEND_API_KEY)." });
    if (r.error) return NextResponse.json({ ok: false, id, message: "Resend: " + (r.error.message || r.error.name) });
    return NextResponse.json({ ok: true, id, message: `Testni mail poslan na ${to}.` });
  }
  if (b.action === "send" && id) {
    const [c] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!c.subject.trim() || (!(c.blocks || []).length && !c.html)) return NextResponse.json({ ok: false, id, message: "Manjka zadeva ali vsebina." }, { status: 400 });
    const r = await sendCampaign(id, 1000);
    return NextResponse.json({ ok: r.ok, id, message: r.ok ? `Poslano: ${r.sent}${r.left ? `, še čaka: ${r.left}` : " — vsem naročnikom ✅"}` : `Poslano ${r.sent || 0}, nato napaka: ${r.error || r.message}` });
  }
  if (b.action === "schedule" && id) {
    const at = new Date(b.at || "");
    if (isNaN(at)) return NextResponse.json({ ok: false, id, message: "Izberi datum in uro." }, { status: 400 });
    if (at.getTime() < Date.now() - 60000) return NextResponse.json({ ok: false, id, message: "Izbrani čas je že mimo." }, { status: 400 });
    const [c] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!c.subject.trim() || (!(c.blocks || []).length && !c.html)) return NextResponse.json({ ok: false, id, message: "Manjka zadeva ali vsebina." }, { status: 400 });
    await sql`UPDATE campaigns SET status = 'načrtovano', scheduled_at = ${at.toISOString()} WHERE id = ${id} AND status IN ('osnutek','načrtovano')`;
    const when = at.toLocaleString("sl-SI", { timeZone: "Europe/Ljubljana", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    return NextResponse.json({ ok: true, id, message: `📅 Načrtovano za ${when}. Pošlje se samodejno (v 15 minutah po tem času).` });
  }
  if (b.action === "unschedule" && id) {
    await sql`UPDATE campaigns SET status = 'osnutek', scheduled_at = NULL WHERE id = ${id} AND status = 'načrtovano'`;
    return NextResponse.json({ ok: true, id, message: "Načrt preklican — kampanja je spet osnutek." });
  }
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get("id");
  const sql = db();
  await sql`DELETE FROM campaigns WHERE id = ${id} AND status IN ('osnutek','načrtovano')`;
  return NextResponse.json({ ok: true });
}
