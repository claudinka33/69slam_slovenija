import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Enkratni prenos slik iz OneDriva (69SLAM OFFICIAL) v Vercel Blob.
 * Zaščiteno z začasnim ključem (v kodi je samo njegov SHA-256) in velja do UPLOAD_UNTIL.
 */
const KEY_SHA256 = "c9ea387a0e28b072a7f55719e43ed56577d6c4ccc7fa71395e53a76f2ee3dfbc";
const UPLOAD_UNTIL = new Date("2026-10-08T00:00:00Z");
const ORIGINS = ["https://onedrive.live.com"];

function cors(req) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-upload-key",
    "Access-Control-Max-Age": "600",
  };
}
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function OPTIONS(req) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}

export async function POST(req) {
  const h = cors(req);
  const bad = (status, message) => NextResponse.json({ ok: false, message }, { status, headers: h });
  if (Date.now() > UPLOAD_UNTIL.getTime()) return bad(410, "Prenos je zaprt.");
  if ((await sha256(req.headers.get("x-upload-key") || "")) !== KEY_SHA256) return bad(401, "Napačen ključ.");
  if (!dbConfigured()) return bad(503, "Ni baze.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return bad(503, "Vercel Blob ni povezan (manjka BLOB_READ_WRITE_TOKEN).");

  const u = new URL(req.url);
  const code = String(u.searchParams.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const pos = parseInt(u.searchParams.get("pos") || "0", 10);
  const source = String(u.searchParams.get("source") || "").slice(0, 300);
  if (!code || !Number.isFinite(pos) || pos < 0 || pos > 20) return bad(400, "Manjka koda ali pozicija.");

  const sql = db();
  await ensureSchema();
  const [p] = await sql`SELECT code FROM products WHERE code = ${code}`;
  if (!p) return bad(404, `Artikel ${code} ne obstaja.`);

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length < 1000 || buf.length > 8 * 1024 * 1024) return bad(400, "Slika je prazna ali prevelika.");
  const type = req.headers.get("content-type") || "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const blob = await put(`products/${code}/${String(pos).padStart(2, "0")}.${ext}`, buf, {
    access: "public", contentType: type, addRandomSuffix: true,
  });
  await sql`INSERT INTO product_images (code, pos, url, source) VALUES (${code}, ${pos}, ${blob.url}, ${source})
    ON CONFLICT (code, pos) DO UPDATE SET url = EXCLUDED.url, source = EXCLUDED.source, created_at = now()`;
  return NextResponse.json({ ok: true, url: blob.url }, { headers: h });
}
