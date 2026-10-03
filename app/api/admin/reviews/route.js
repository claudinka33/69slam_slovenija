import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { primeCatalog, getAnyProduct } from "../../../../lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, reviews: [] });
  await ensureSchema();
  await primeCatalog();
  const rows = await db()`SELECT r.*, o.number FROM reviews r LEFT JOIN orders o ON o.id = r.order_id ORDER BY (r.status = 'caka') DESC, r.created_at DESC LIMIT 500`;
  return NextResponse.json({ ok: true, reviews: rows.map((r) => { const p = getAnyProduct(r.code); return { ...r, pname: p?.name || r.code, img: p?.img || "" }; }) });
}

/** { id, status: "objavljeno" | "skrito" } ali { id, delete: true } */
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const sql = db();
  await ensureSchema();
  if (b.delete) await sql`DELETE FROM reviews WHERE id = ${b.id}`;
  else if (["objavljeno", "skrito", "caka"].includes(b.status)) await sql`UPDATE reviews SET status = ${b.status} WHERE id = ${b.id}`;
  else return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
  revalidateTag("reviews");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
