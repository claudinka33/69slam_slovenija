import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Slike iz baze: slika »ZOOM« (po imenu izvorne datoteke) gre na prvo mesto. */
export async function POST() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const sql = db();
  await ensureSchema();
  const moved = await sql`SELECT DISTINCT code FROM product_images
    WHERE source ILIKE '%ZOOM%' AND pos > 0
      AND code NOT IN (SELECT code FROM product_images WHERE pos = 0 AND source ILIKE '%ZOOM%')`;
  await sql`UPDATE product_images SET pos = pos + 1000`;
  await sql`UPDATE product_images p SET pos = r.np FROM (
      SELECT code, pos, row_number() OVER (PARTITION BY code ORDER BY (COALESCE(source, '') ILIKE '%ZOOM%') DESC, pos) - 1 AS np
      FROM product_images) r
    WHERE p.code = r.code AND p.pos = r.pos`;
  revalidateTag("catalog");
  revalidatePath("/", "layout");
  const nozoom = await sql`SELECT code FROM product_images GROUP BY code
    HAVING bool_or(COALESCE(source, '') ILIKE '%ZOOM%') = false ORDER BY code`;
  return NextResponse.json({ ok: true, moved: moved.length, nozoom: nozoom.map((r) => r.code) });
}
