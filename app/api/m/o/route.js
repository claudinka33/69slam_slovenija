import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { sign } from "../../../../lib/marketing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

/** Neviden piksel v mailu kampanje — zabeleži odprtje. */
export async function GET(req) {
  const u = new URL(req.url);
  const cid = Number(u.searchParams.get("c")) || 0;
  const email = String(u.searchParams.get("e") || "").toLowerCase().trim();
  try {
    if (cid && email && u.searchParams.get("s") === sign("mo", cid, email) && dbConfigured()) {
      await ensureSchema();
      await db()`INSERT INTO campaign_events (campaign_id, email, kind) VALUES (${cid}, ${email}, 'open')`;
    }
  } catch {}
  return new NextResponse(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
}
