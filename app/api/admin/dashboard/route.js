import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema, catalogMeta } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Europe/Ljubljana";

/** Dashboard: stat kartice, prodaja po dnevih, top 5 printov, zadnja naročila. ?days=7|30|90 */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, nodb: true });
  const days = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get("days")))
    ? Number(new URL(req.url).searchParams.get("days"))
    : 30;
  const sql = db();
  await ensureSchema();

  const [cur] = await sql`SELECT COALESCE(SUM(total_cents),0)::bigint AS revenue, COUNT(*)::int AS orders
    FROM orders WHERE status <> 'preklicano' AND created_at >= now() - make_interval(days => ${days})`;
  const [prev] = await sql`SELECT COALESCE(SUM(total_cents),0)::bigint AS revenue, COUNT(*)::int AS orders
    FROM orders WHERE status <> 'preklicano'
      AND created_at >= now() - make_interval(days => ${days * 2})
      AND created_at <  now() - make_interval(days => ${days})`;

  // % vračajočih: kupci v obdobju, ki imajo skupaj ≥2 naročili
  const [ret] = await sql`WITH buyers AS (
      SELECT DISTINCT lower(email) AS e FROM orders
      WHERE status <> 'preklicano' AND created_at >= now() - make_interval(days => ${days})),
    counts AS (
      SELECT lower(email) AS e, COUNT(*) AS n FROM orders WHERE status <> 'preklicano' GROUP BY lower(email))
    SELECT COUNT(*)::int AS buyers, COUNT(*) FILTER (WHERE c.n >= 2)::int AS returning
    FROM buyers b JOIN counts c ON c.e = b.e`;

  const daily = await sql`SELECT to_char((created_at AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS d,
      COALESCE(SUM(total_cents),0)::bigint AS revenue, COUNT(*)::int AS orders
    FROM orders WHERE status <> 'preklicano' AND created_at >= now() - make_interval(days => ${days + 1})
    GROUP BY 1 ORDER BY 1`;

  const top = await sql`SELECT COALESCE(v.code, split_part(oi.sku, '-', 1)) AS code,
      MAX(COALESCE(p.name, oi.name)) AS name, SUM(oi.qty)::int AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN variants v ON v.sku = oi.sku
    LEFT JOIN products p ON p.code = COALESCE(v.code, split_part(oi.sku, '-', 1))
    WHERE o.status <> 'preklicano' AND oi.sku <> '-' AND oi.sku <> '' AND o.created_at >= now() - make_interval(days => ${days})
    GROUP BY 1 ORDER BY qty DESC LIMIT 5`;

  const recent = await sql`SELECT id, number, status, name, email, total_cents, created_at, source
    FROM orders ORDER BY created_at DESC, id DESC LIMIT 6`;

  // seznam dni (tudi dnevi brez prodaje = 0)
  const map = Object.fromEntries(daily.map((r) => [r.d, r]));
  const series = [];
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    series.push({ d: key, revenue: Number(map[key]?.revenue || 0), orders: map[key]?.orders || 0 });
  }

  const meta = catalogMeta();
  const revenue = Number(cur.revenue), prevRevenue = Number(prev.revenue);
  return NextResponse.json({
    ok: true,
    days,
    stats: {
      revenue,
      revenueChange: prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null,
      orders: cur.orders,
      ordersChange: prev.orders > 0 ? Math.round(((cur.orders - prev.orders) / prev.orders) * 100) : null,
      aov: cur.orders ? Math.round(revenue / cur.orders) : 0,
      returningPct: ret.buyers ? Math.round((ret.returning / ret.buyers) * 100) : 0,
      buyers: ret.buyers,
    },
    series,
    top: top.map((t) => ({ ...t, img: meta[t.code]?.img || null })),
    recent: recent.map((o) => ({ ...o, id: Number(o.id), number: Number(o.number) })),
  });
}
