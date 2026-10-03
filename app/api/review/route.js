import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../lib/db";
import { submitReviews } from "../../../lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const b = await req.json().catch(() => null);
  if (!b || !dbConfigured()) return NextResponse.json({ ok: false, message: "Poskusi kasneje." }, { status: 400 });
  await ensureSchema();
  const r = await submitReviews({ orderId: Number(b.o), token: String(b.t || ""), name: b.name, reviews: Array.isArray(b.reviews) ? b.reviews.slice(0, 20) : [] });
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
