import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email || "").trim().toLowerCase();
  const en = b?.lang === "en";
  const hr = b?.lang === "hr";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
    return NextResponse.json({ ok: false, message: en ? "Please enter a valid e-mail." : hr ? "Upiši ispravnu e-mail adresu." : "Vpiši pravilen e-mail." }, { status: 400 });
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: en ? "Please try again later." : hr ? "Pokušaj kasnije." : "Poskusi kasneje." }, { status: 503 });
  await ensureSchema();
  const lang = ["sl", "hr", "en"].includes(b.lang) ? b.lang : "sl";
  await db()`INSERT INTO subscribers (email, lang, source) VALUES (${email}, ${lang}, 'noga strani')
    ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL`;
  return NextResponse.json({ ok: true, message: en ? "Thanks! You're on the list. 🙌" : hr ? "Hvala! Prijava je uspjela. 🙌" : "Hvala! Prijava je uspela. 🙌" });
}
