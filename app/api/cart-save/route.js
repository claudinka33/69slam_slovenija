import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../lib/db";
import { saveCart } from "../../../lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shrani košarico z e-mailom (za opomnik, če nakup ni zaključen). */
export async function POST(req) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email || "").trim().toLowerCase();
  if (!dbConfigured() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !Array.isArray(b?.cart) || !b.cart.length || b.cart.length > 40)
    return NextResponse.json({ ok: false });
  await ensureSchema();
  const lang = ["sl", "hr", "en"].includes(b.lang) ? b.lang : "sl";
  const cart = b.cart.map((l) => (l.bundle
    ? { bundle: true, qty: 1, items: (l.items || []).slice(0, 3).map((x) => ({ id: String(x.id).slice(0, 40), size: String(x.size).slice(0, 10) })) }
    : { id: String(l.id).slice(0, 40), size: String(l.size).slice(0, 10), qty: Math.max(1, Math.min(20, parseInt(l.qty, 10) || 1)) }));
  const token = await saveCart({ token: b.token, email, lang, cart, total: Math.round((Number(b.total) || 0) * 100) });
  return NextResponse.json({ ok: true, token });
}

/** Vrne shranjeno košarico (povezava iz opomnika). */
export async function GET(req) {
  const t = new URL(req.url).searchParams.get("c") || "";
  if (!dbConfigured() || !/^[a-f0-9]{24}$/.test(t)) return NextResponse.json({ ok: false });
  await ensureSchema();
  const { db } = await import("../../../lib/db");
  const [c] = await db()`SELECT cart, lang FROM carts WHERE token = ${t}`;
  return NextResponse.json(c ? { ok: true, cart: c.cart, lang: c.lang } : { ok: false });
}
