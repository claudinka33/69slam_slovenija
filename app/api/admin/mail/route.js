import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { getSettings, saveSettings, processJobs } from "../../../../lib/marketing";
import { mailConfigured } from "../../../../lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Nastavitve samodejnih mailov, dnevnik, naročniki. ?view=subs&q= za seznam naročnikov. */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false });
  await ensureSchema();
  const sql = db();
  const u = new URL(req.url);
  if (u.searchParams.get("view") === "subs") {
    const q = `%${(u.searchParams.get("q") || "").trim().toLowerCase()}%`;
    const subs = await sql`SELECT id, email, name, lang, source, created_at, unsubscribed_at FROM subscribers
      WHERE lower(email) LIKE ${q} OR lower(COALESCE(name,'')) LIKE ${q} ORDER BY created_at DESC LIMIT 300`;
    return NextResponse.json({ ok: true, subs });
  }
  const [stats] = await sql`SELECT
      (SELECT COUNT(*) FROM subscribers WHERE unsubscribed_at IS NULL)::int AS active,
      (SELECT COUNT(*) FROM subscribers WHERE unsubscribed_at IS NOT NULL)::int AS unsub,
      (SELECT COUNT(*) FROM mail_jobs WHERE status = 'cakajoce')::int AS waiting,
      (SELECT COUNT(*) FROM mail_jobs WHERE status = 'poslano' AND sent_at > now() - interval '30 days')::int AS sent30,
      (SELECT COUNT(*) FROM carts WHERE created_at > now() - interval '30 days')::int AS carts30,
      (SELECT COUNT(*) FROM carts WHERE recovered_order IS NOT NULL AND created_at > now() - interval '30 days')::int AS recovered30,
      (SELECT COALESCE(SUM(o.total_cents),0) FROM carts c JOIN orders o ON o.id = c.recovered_order WHERE c.created_at > now() - interval '30 days'
         AND EXISTS (SELECT 1 FROM mail_jobs j WHERE j.ref_id = c.id AND j.kind IN ('cart1','cart2') AND j.status = 'poslano'))::int AS recovered_cents`;
  const jobs = await sql`SELECT j.id, j.kind, j.email, j.send_at, j.sent_at, j.status, j.info FROM mail_jobs j
    ORDER BY (j.status = 'cakajoce') DESC, COALESCE(j.sent_at, j.send_at) DESC LIMIT 80`;
  return NextResponse.json({ ok: true, settings: await getSettings(), stats, jobs, resend: mailConfigured(), cron: Boolean(process.env.CRON_SECRET) });
}

/** { settings } | { action: "run" } | { action: "unsub"|"resub"|"add", email } */
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  const sql = db();
  if (b.settings) {
    const n = (v, lo, hi, d) => { const x = parseInt(v, 10); return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : d; };
    const s = b.settings;
    const saved = await saveSettings({ review_on: !!s.review_on, review_days: n(s.review_days, 1, 60, 10), review_discount: n(s.review_discount, 0, 50, 10),
      cart_on: !!s.cart_on, cart_h1: n(s.cart_h1, 1, 72, 1), cart_h2: n(s.cart_h2, 2, 168, 24), cart_discount2: n(s.cart_discount2, 0, 50, 10) });
    return NextResponse.json({ ok: true, settings: saved });
  }
  if (b.action === "run") return NextResponse.json({ ok: true, ...(await processJobs(40)) });
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, message: "E-mail ni pravilen." }, { status: 400 });
  if (b.action === "add") await sql`INSERT INTO subscribers (email, lang, source, name) VALUES (${email}, 'sl', 'ročno', ${b.name || null})
    ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL`;
  else if (b.action === "unsub") await sql`UPDATE subscribers SET unsubscribed_at = now() WHERE lower(email) = ${email}`;
  else if (b.action === "resub") await sql`UPDATE subscribers SET unsubscribed_at = NULL WHERE lower(email) = ${email}`;
  else return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
