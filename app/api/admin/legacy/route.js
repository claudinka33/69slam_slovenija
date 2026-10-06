import { NextResponse } from "next/server";
import { ensureSchema } from "../../../../lib/db";
import { buildLegacyMap, legacyInfo, legacyTarget } from "../../../../lib/legacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req) {
  await ensureSchema();
  const t = new URL(req.url).searchParams.get("test");
  return NextResponse.json({ ok: true, info: await legacyInfo(), ...(t ? { test: t, to: await legacyTarget(t) } : {}) });
}

export async function POST() {
  await ensureSchema();
  try { return NextResponse.json(await buildLegacyMap()); }
  catch (e) { return NextResponse.json({ ok: false, message: String(e.message || e) }, { status: 502 }); }
}
