import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../../lib/db";
import { monthSummary, monthPackage, logMonth, prevMonth } from "../../../../lib/monthclose";
import { getInvSettings, saveInvSettings } from "../../../../lib/invoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ?m=YYYY-MM → povzetek meseca | ?m=YYYY-MM&zip=1 → prenos ZIP */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false });
  await ensureSchema();
  const u = new URL(req.url);
  const m = u.searchParams.get("m") || prevMonth();
  try {
    if (u.searchParams.get("zip")) {
      const p = await monthPackage(m);
      return new NextResponse(p.zip, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${p.filename}"` } });
    }
    const s = await getInvSettings();
    return NextResponse.json({ ok: true, summary: await monthSummary(m), accountant_email: s.accountant_email || "" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e?.message || e) }, { status: 400 });
  }
}

/** { m, to } → pošlje paket računovodkinji (e-mail se zapomni) */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  const b = await req.json().catch(() => ({}));
  const to = String(b.to || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ ok: false, message: "Vpiši e-mail računovodkinje." }, { status: 400 });
  try {
    const p = await monthPackage(b.m);
    if (p.zip.length > 35 * 1024 * 1024) return NextResponse.json({ ok: false, message: "Paket je prevelik za e-mail — prenesi ZIP in ga pošlji ročno." }, { status: 400 });
    await saveInvSettings({ accountant_email: to });
    const { send, esc } = await import("../../../../lib/mail");
    const [y, mo] = b.m.split("-");
    const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
    const note = String(b.note || "").trim().slice(0, 1000);
    const html = `<div style="font-family:Arial,sans-serif;color:#0a0a0a;max-width:560px"><p style="font-size:15px;line-height:1.65;margin:0">Pozdravljeni!</p>
<p style="font-size:15px;line-height:1.65">V prilogi pošiljamo dokumente za <b>${esc(label)}</b>: ${p.count} računov in dobropisov (PDF) ter seznam v Excelu${p.receipts ? ` (z ${p.receipts} prevzemi blaga)` : ""}.</p>
${note ? `<p style="font-size:15px;line-height:1.65">${esc(note).replace(/\n/g, "<br>")}</p>` : ""}
<p style="font-size:15px;line-height:1.65">Lep pozdrav,<br>Claudia Seidl<br>Freestyle Freak d.o.o.</p></div>`;
    const r = await send({ to, subject: `Računi ${label} · Freestyle Freak d.o.o.`, html, attachments: [{ filename: p.filename, content: p.zip.toString("base64") }] });
    if (r.skipped) return NextResponse.json({ ok: false, message: "Resend ni nastavljen." }, { status: 503 });
    if (r.error) return NextResponse.json({ ok: false, message: "Pošiljanje ni uspelo: " + (r.error.message || r.error.name) }, { status: 502 });
    await logMonth(b.m, { sent_at: new Date().toISOString(), to, count: p.count });
    return NextResponse.json({ ok: true, message: `Poslano na ${to} ✓ (${p.count} dokumentov)` });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e?.message || e).slice(0, 200) }, { status: 400 });
  }
}
