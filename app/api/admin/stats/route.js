import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TZ = "Europe/Ljubljana";

/** Lastna statistika obiska. ?days=1 (danes) | 7 | 30 | 90 */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, nodb: true });
  const q = Number(new URL(req.url).searchParams.get("days"));
  const days = [1, 7, 30, 90].includes(q) ? q : 30;
  const sql = db();
  await ensureSchema();

  // začetek obdobja: polnoč po slovenskem času (danes = od polnoči)
  const [{ since }] = await sql`SELECT ((date_trunc('day', now() AT TIME ZONE ${TZ}) - make_interval(days => ${days - 1})) AT TIME ZONE ${TZ}) AS since`;

  const [tot] = await sql`SELECT COUNT(DISTINCT vid)::int AS visitors, COUNT(*) FILTER (WHERE kind = 'view')::int AS pageviews
    FROM stat_events WHERE at >= ${since}`;

  const [funnel] = await sql`WITH e AS (SELECT * FROM stat_events WHERE at >= ${since}),
      p AS (SELECT e.vid, o.total_cents FROM e JOIN orders o ON o.number::text = e.item
            WHERE e.kind = 'purchase' AND o.status <> 'preklicano')
    SELECT COUNT(DISTINCT vid)::int AS visitors,
      COUNT(DISTINCT vid) FILTER (WHERE kind = 'product')::int AS product,
      COUNT(DISTINCT vid) FILTER (WHERE kind = 'cart')::int AS cart,
      COUNT(DISTINCT vid) FILTER (WHERE kind = 'checkout')::int AS checkout,
      (SELECT COUNT(*)::int FROM p) AS purchases,
      (SELECT COUNT(DISTINCT vid)::int FROM p) AS buyers,
      (SELECT COALESCE(SUM(total_cents),0)::bigint FROM p) AS revenue
    FROM e`;

  const sources = await sql`WITH e AS (SELECT * FROM stat_events WHERE at >= ${since}),
      v AS (SELECT vid, COALESCE((array_agg(source ORDER BY at) FILTER (WHERE source IS NOT NULL))[1], 'Direktno') AS src
            FROM e GROUP BY vid),
      p AS (SELECT e.vid, o.total_cents FROM e JOIN orders o ON o.number::text = e.item
            WHERE e.kind = 'purchase' AND o.status <> 'preklicano')
    SELECT v.src AS source, COUNT(*)::int AS visitors,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM e x WHERE x.vid = v.vid AND x.kind = 'cart'))::int AS carts,
      (SELECT COUNT(*)::int FROM p WHERE p.vid IN (SELECT vid FROM v v2 WHERE v2.src = v.src)) AS purchases,
      (SELECT COALESCE(SUM(total_cents),0)::bigint FROM p WHERE p.vid IN (SELECT vid FROM v v2 WHERE v2.src = v.src)) AS revenue
    FROM v GROUP BY v.src ORDER BY visitors DESC LIMIT 20`;

  const campaigns = await sql`SELECT campaign, source, COUNT(DISTINCT vid)::int AS visitors
    FROM stat_events WHERE at >= ${since} AND campaign IS NOT NULL
    GROUP BY campaign, source ORDER BY visitors DESC LIMIT 15`;

  const pages = await sql`SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT vid)::int AS visitors
    FROM stat_events WHERE at >= ${since} AND kind = 'view' AND path IS NOT NULL
    GROUP BY path ORDER BY views DESC LIMIT 20`;

  const products = await sql`SELECT item,
      COUNT(DISTINCT vid) FILTER (WHERE kind = 'product')::int AS views,
      COUNT(DISTINCT vid) FILTER (WHERE kind = 'cart')::int AS carts
    FROM stat_events WHERE at >= ${since} AND kind IN ('product', 'cart') AND item IS NOT NULL
    GROUP BY item ORDER BY views DESC, carts DESC LIMIT 20`;

  const devices = await sql`SELECT device, COUNT(DISTINCT vid)::int AS visitors
    FROM stat_events WHERE at >= ${since} GROUP BY device ORDER BY visitors DESC`;

  const daily = await sql`SELECT to_char((at AT TIME ZONE ${TZ})::date, 'YYYY-MM-DD') AS d,
      COUNT(DISTINCT vid)::int AS visitors, COUNT(*) FILTER (WHERE kind = 'view')::int AS pageviews
    FROM stat_events WHERE at >= ${since} GROUP BY 1 ORDER BY 1`;

  const [live] = await sql`SELECT COUNT(DISTINCT vid)::int AS n FROM stat_events WHERE at >= now() - interval '30 minutes'`;
  const [first] = await sql`SELECT MIN(at) AS at FROM stat_events`;

  return NextResponse.json({
    ok: true, days, since, totals: tot, funnel, sources, campaigns, pages, products, devices, daily,
    live: live?.n || 0, startedAt: first?.at || null,
  });
}
