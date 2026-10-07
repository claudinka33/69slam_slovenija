import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { sendAdminNotice } from "../../../../lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Predogled maila »Novo naročilo« (brez pošiljanja): ?number=1003 */
export async function GET(req) {
  if (!dbConfigured()) return new NextResponse("Baza ni povezana.", { status: 503 });
  await ensureSchema();
  const n = new URL(req.url).searchParams.get("number");
  const [o] = await db()`SELECT id FROM orders WHERE number = ${n} LIMIT 1`;
  if (!o) return new NextResponse("Ni naročila.", { status: 404 });
  const html = await sendAdminNotice(o.id, { preview: true });
  return new NextResponse(html || "—", { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
