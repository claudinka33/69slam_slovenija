import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../lib/db";
import { checkCoupon } from "../../../lib/coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Preveri kodo na blagajni: { code, email, subtotal } → { ok, code, percent } */
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const lang = ["sl", "hr", "en"].includes(b.lang) ? b.lang : "sl";
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: lang === "en" ? "Codes are not available right now." : lang === "hr" ? "Kod trenutno nije dostupan." : "Koda trenutno ni na voljo." }, { status: 503 });
  const sql = db();
  await ensureSchema();
  const r = await checkCoupon(sql, b.code, b.email, b.subtotal != null ? Math.round(Number(b.subtotal) * 100) : null, lang);
  return NextResponse.json(r.ok ? { ok: true, ...r.coupon } : r);
}
