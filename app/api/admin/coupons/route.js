import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { normCode } from "../../../../lib/coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, coupons: [] });
  const sql = db();
  await ensureSchema();
  const rows = await sql`SELECT c.*, COALESCE(u.n, 0)::int AS uses, COALESCE(u.disc, 0)::int AS discount_cents, COALESCE(u.rev, 0)::int AS revenue_cents
    FROM coupons c LEFT JOIN (
      SELECT coupon_code, COUNT(*) AS n, SUM(discount_cents) AS disc, SUM(total_cents) AS rev
      FROM orders WHERE coupon_code IS NOT NULL AND status <> 'preklicano' GROUP BY coupon_code
    ) u ON u.coupon_code = c.code ORDER BY c.created_at DESC, c.id DESC`;
  return NextResponse.json({ ok: true, coupons: rows });
}

/** Ustvari ali posodobi kodo. */
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const code = normCode(b.code);
  const pct = parseInt(b.percent, 10);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return NextResponse.json({ ok: false, message: "Koda: 3–30 znakov, samo črke, številke, - in _." }, { status: 400 });
  if (!Number.isFinite(pct) || pct < 1 || pct > 90) return NextResponse.json({ ok: false, message: "Popust mora biti med 1 in 90 %." }, { status: 400 });
  const d = (v, end) => (v ? new Date(`${v}T${end ? "23:59:59" : "00:00:00"}+02:00`).toISOString() : null);
  const min = b.min_order ? Math.round(parseFloat(String(b.min_order).replace(",", ".")) * 100) : 0;
  const max = b.max_uses ? parseInt(b.max_uses, 10) : null;
  const sql = db();
  await ensureSchema();
  if (b.id) {
    await sql`UPDATE coupons SET code = ${code}, percent = ${pct}, active = ${b.active !== false}, starts_at = ${d(b.starts)},
      expires_at = ${d(b.ends, true)}, min_order_cents = ${min || 0}, once_per_email = ${!!b.once}, max_uses = ${max},
      note = ${b.note ? String(b.note).slice(0, 200) : null}, stack = ${!!b.stack} WHERE id = ${b.id}`;
  } else {
    const ex = await sql`SELECT id FROM coupons WHERE code = ${code}`;
    if (ex.length) return NextResponse.json({ ok: false, message: `Koda ${code} že obstaja.` }, { status: 409 });
    await sql`INSERT INTO coupons (code, percent, active, starts_at, expires_at, min_order_cents, once_per_email, max_uses, note, stack)
      VALUES (${code}, ${pct}, ${b.active !== false}, ${d(b.starts)}, ${d(b.ends, true)}, ${min || 0}, ${!!b.once}, ${max},
        ${b.note ? String(b.note).slice(0, 200) : null}, ${!!b.stack})`;
  }
  return NextResponse.json({ ok: true, message: `Koda ${code} shranjena.` });
}

export async function DELETE(req) {
  const id = new URL(req.url).searchParams.get("id");
  const sql = db();
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM orders o JOIN coupons c ON c.code = o.coupon_code WHERE c.id = ${id}`;
  if (n > 0) {
    await sql`UPDATE coupons SET active = false WHERE id = ${id}`;
    return NextResponse.json({ ok: true, message: "Koda je bila že uporabljena, zato je samo izklopljena (zaradi zgodovine naročil)." });
  }
  await sql`DELETE FROM coupons WHERE id = ${id}`;
  return NextResponse.json({ ok: true, message: "Koda izbrisana." });
}
