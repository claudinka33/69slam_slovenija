import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { put, del } from "@vercel/blob";
import { db, dbConfigured, ensureSchema } from "../../../../../lib/db";
import { getRawProduct, imgSrcOf } from "../../../../../lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function current(sql, code) {
  const rows = await sql`SELECT url FROM product_images WHERE code = ${code} ORDER BY pos`;
  if (rows.length) return rows.map((r) => r.url);
  // prvič: slike iz kataloga (Shopify) prenesemo v bazo, da jih lahko urejaš (samo osnovne iz kataloga, ne predpomnjene iz baze)
  const raw = getRawProduct(code);
  return raw ? (raw.images || []).map(imgSrcOf).filter(Boolean) : [];
}
async function save(sql, code, urls) {
  await sql`DELETE FROM product_images WHERE code = ${code}`;
  if (urls.length)
    await sql`INSERT INTO product_images (code, pos, url, source)
      SELECT ${code}, pos - 1, url, 'cms' FROM unnest(${urls}::text[]) WITH ORDINALITY AS t(url, pos)`;
  revalidateTag("catalog");
  revalidatePath("/", "layout");
}

/** Slike artikla: ?code=…&action=upload (telo = slika) ali JSON { code, action: "order"|"delete", urls|url } */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const u = new URL(req.url);
  const sql = db();
  await ensureSchema();
  if (u.searchParams.get("action") === "upload") {
    const code = u.searchParams.get("code") || "";
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false, message: "Vercel Blob ni povezan." }, { status: 503 });
    const [p] = await sql`SELECT code FROM products WHERE code = ${code}`;
    if (!p) return NextResponse.json({ ok: false, message: "Artikel ne obstaja." }, { status: 404 });
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length < 500 || buf.length > 8 * 1024 * 1024) return NextResponse.json({ ok: false, message: "Slika je prazna ali prevelika." }, { status: 400 });
    const type = req.headers.get("content-type") || "image/jpeg";
    const blob = await put(`products/${code}/cms.${type.includes("png") ? "png" : "jpg"}`, buf, { access: "public", contentType: type, addRandomSuffix: true });
    const urls = await current(sql, code);
    urls.push(blob.url);
    await save(sql, code, urls);
    return NextResponse.json({ ok: true, images: urls });
  }
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "");
  let urls = await current(sql, code);
  if (b.action === "order" && Array.isArray(b.urls)) {
    const set = new Set(urls);
    urls = b.urls.filter((x) => set.has(x));
  } else if (b.action === "delete" && b.url) {
    urls = urls.filter((x) => x !== b.url);
    if (String(b.url).includes(".blob.vercel-storage.com")) await del(b.url).catch(() => {});
  } else return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
  await save(sql, code, urls);
  return NextResponse.json({ ok: true, images: urls });
}
