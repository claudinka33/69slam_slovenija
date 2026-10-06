import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enkratni prenos detajlnih slik (izrezi iz OneDriva) v Vercel Blob. Ključ velja do UPLOAD_UNTIL. */
const KEY_SHA256 = "0c316ba2612d083d0bccf1cfc4175fc31b7cd790fa66387d9bd25447193e9aeb";
const UPLOAD_UNTIL = new Date("2026-10-08T00:00:00Z");
const ORIGIN = "https://onedrive.live.com";
const h = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, x-upload-key", "Access-Control-Max-Age": "600" };

async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: h });
}

export async function POST(req) {
  const bad = (status, message) => NextResponse.json({ ok: false, message }, { status, headers: h });
  if (Date.now() > UPLOAD_UNTIL.getTime()) return bad(410, "Prenos je zaprt.");
  if ((await sha256(req.headers.get("x-upload-key") || "")) !== KEY_SHA256) return bad(401, "Napačen ključ.");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return bad(503, "Ni Vercel Blob.");
  const name = String(new URL(req.url).searchParams.get("name") || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!name) return bad(400, "Manjka ime.");
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length < 1000 || buf.length > 4 * 1024 * 1024) return bad(400, "Slika je prazna ali prevelika.");
  const blob = await put(`detail/${name}.jpg`, buf, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
  return NextResponse.json({ ok: true, url: blob.url }, { headers: h });
}
