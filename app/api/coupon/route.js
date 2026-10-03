import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../lib/db";
import { checkCoupon } from "../../../lib/coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Preveri kodo na blagajni: { code, email, subtotal } → { ok, code, percent } */
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Koda trenutno ni na voljo." }, { status: 503 });
  const sql = db();
  await ensureSchema();
  const r = await checkCoupon(sql, b.code, b.email, b.subtotal != null ? Math.round(Number(b.subtotal) * 100) : null, b.lang === "en");
  return NextResponse.json(r.ok ? { ok: true, ...r.coupon } : r);
}
