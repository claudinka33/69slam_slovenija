import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { put } from "@vercel/blob";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { GALLERY } from "../../../../lib/media";
import { mirrorKey } from "../../../../lib/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// logotip in ikona (prepare-assets jih ob buildu prenese)
const EXTRA = [
  "https://cdn.shopify.com/s/files/1/0778/4018/7715/files/Logo_69slam_BEL.png",
  "https://cdn.shopify.com/s/files/1/0778/4018/7715/files/logo_69slam_slo_100.png",
];

/** Vsi Shopify naslovi slik, ki jih trgovina uporablja (katalog, slike v CMS, galerija, logotip). */
async function allSources(sql) {
  const set = new Set(EXTRA);
  const raw = fs.readFileSync(path.join(process.cwd(), "data/catalog.json"), "utf8");
  for (const m of raw.matchAll(/https:\/\/cdn\.shopify\.com\/[^"?\s]+/g)) set.add(m[0]);
  for (const g of GALLERY) set.add(mirrorKey(g));
  const rows = await sql`SELECT url FROM product_images WHERE url LIKE '%cdn.shopify.com%'`;
  for (const r of rows) set.add(mirrorKey(r.url));
  return [...set];
}

async function pending(sql) {
  const all = await allSources(sql);
  const done = new Set((await sql`SELECT src FROM image_mirror`).map((r) => r.src));
  return { all, todo: all.filter((s) => !done.has(s)) };
}

async function copyOne(src) {
  const heic = /\.heic$/i.test(src);
  const res = await fetch(`${src}?width=1600${heic ? "&format=jpg" : ""}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("prazna slika");
  const type = res.headers.get("content-type") || "image/jpeg";
  let name = src.split("/").pop().replace(/[^A-Za-z0-9._-]/g, "_");
  if (heic) name = name.replace(/\.heic$/i, ".jpg");
  const blob = await put(`shopify/${name}`, buf, { access: "public", contentType: type, addRandomSuffix: true });
  return blob.url;
}

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const sql = db();
  await ensureSchema();
  const { all, todo } = await pending(sql);
  return NextResponse.json({ ok: true, total: all.length, done: all.length - todo.length, remaining: todo.length });
}

/** En krog prenosa (~40 s). Stran /admin/slike ga kliče, dokler ni vse preneseno. */
export async function POST() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ ok: false, message: "Vercel Blob ni povezan." }, { status: 503 });
  const sql = db();
  await ensureSchema();
  const { all, todo } = await pending(sql);
  const started = Date.now();
  const failed = [];
  let copied = 0;
  let i = 0;
  const worker = async () => {
    while (i < todo.length && Date.now() - started < 40000) {
      const src = todo[i++];
      try {
        const url = await copyOne(src);
        await sql`INSERT INTO image_mirror (src, url) VALUES (${src}, ${url}) ON CONFLICT (src) DO UPDATE SET url = EXCLUDED.url`;
        copied++;
      } catch (e) {
        failed.push({ src, error: String(e.message || e) });
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (copied) {
    revalidateTag("catalog");
    revalidatePath("/", "layout");
  }
  const remaining = todo.length - copied;
  return NextResponse.json({ ok: true, total: all.length, done: all.length - remaining, remaining, copied, failed });
}
