import { NextResponse } from "next/server";
import { legacyTarget } from "../../../lib/legacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stare Shopify povezave → trajna preusmeritev (301) na novo stran. Kliče se prek rewrites v next.config. */
export async function GET(req) {
  const u = new URL(req.url);
  const p = u.searchParams.get("p") || "/";
  let to = "/sl";
  try { to = await legacyTarget(p); } catch {}
  return NextResponse.redirect(new URL(to, u.origin), 301);
}
