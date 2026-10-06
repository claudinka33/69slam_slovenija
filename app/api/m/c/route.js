import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { sign } from "../../../../lib/marketing";
import { SITE } from "../../../../lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Klik na povezavo v mailu kampanje — zabeleži klik, si zapomni kampanjo (za naročilo) in preusmeri naprej. */
export async function GET(req) {
  const u = new URL(req.url);
  const cid = Number(u.searchParams.get("c")) || 0;
  const email = String(u.searchParams.get("e") || "").toLowerCase().trim();
  const to = String(u.searchParams.get("u") || "");
  const ok = cid && email && /^https?:\/\//i.test(to) && u.searchParams.get("s") === sign("mc", cid, email, to);
  if (!ok) return NextResponse.redirect(SITE, 302);
  try {
    if (dbConfigured()) {
      await ensureSchema();
      await db()`INSERT INTO campaign_events (campaign_id, email, kind, url) VALUES (${cid}, ${email}, 'click', ${to.slice(0, 500)})`;
    }
  } catch {}
  const res = NextResponse.redirect(to, 302);
  res.cookies.set("c69", `${cid}.${Date.now()}`, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax", secure: true });
  return res;
}
