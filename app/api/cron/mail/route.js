import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../../lib/db";
import { processJobs, processCampaigns } from "../../../../lib/marketing";
import { fursRetry } from "../../../../lib/furs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Samodejni maili (opomniki za košarico, prošnje za oceno). Kliče ga cron-job.org vsakih 15 min in Vercel cron 1× na dan. */
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const u = new URL(req.url);
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") || u.searchParams.get("key") || "";
  if (!secret || given !== secret) return NextResponse.json({ ok: false, message: "Ni dovoljenja." }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  // kampanje najprej; vsak del posebej, da napaka v enem ne ustavi ostalih
  const campaign = await processCampaigns(400).catch((e) => ({ error: String(e?.message || e) }));
  const r = await processJobs(40).catch((e) => ({ jobsError: String(e?.message || e) }));
  const furs = await fursRetry(20).catch((e) => ({ error: String(e?.message || e) }));
  return NextResponse.json({ ok: true, ...r, furs, campaign });
}
