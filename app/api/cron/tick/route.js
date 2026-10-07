import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { processJobs, processCampaigns } from "../../../../lib/marketing";
import { fursRetry } from "../../../../lib/furs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * »Utrip« za samodejna opravila (maili, kampanje, FURS) — brez ključa, ker obdela samo opravila, ki jim je že napočil čas.
 * Največ 1× na 4 minute (zapis v settings), da ga ni mogoče zlorabiti. Kliče ga GitHub Actions vsakih 15 min.
 */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  await ensureSchema();
  const sql = db();
  const [lock] = await sql`INSERT INTO settings (key, value) VALUES ('cron_tick', ${JSON.stringify({ at: new Date().toISOString() })}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    WHERE (settings.value->>'at')::timestamptz < now() - interval '4 minutes'
    RETURNING key`;
  if (!lock) return NextResponse.json({ ok: true, skipped: "prezgodaj" });
  const campaign = await processCampaigns(400).catch((e) => ({ error: String(e?.message || e) }));
  const jobs = await processJobs(40).catch((e) => ({ error: String(e?.message || e) }));
  const furs = await fursRetry(20).catch((e) => ({ error: String(e?.message || e) }));
  return NextResponse.json({ ok: true, campaign, jobs, furs });
}
