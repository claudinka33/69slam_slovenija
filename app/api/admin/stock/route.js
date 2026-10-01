import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema, catalogMeta, productCategory } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const REASONS = ["prejem", "inventura", "rocno"];

/** Zaloga kot matrika: ena vrstica na print. */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, rows: [], products: [], nodb: true });
  const sql = db();
  await ensureSchema();
  const rows = await sql`SELECT v.sku, v.code, v.size, v.stock, p.name, p.collection, p.price_cents, p.active
    FROM variants v JOIN products p ON p.code = v.code
    ORDER BY p.name, array_position(ARRAY['XS','S','M','L','XL','XXL'], v.size)`;
  const imgs = await sql`SELECT code, url FROM product_images ORDER BY code, pos`;
  const dbImg = {};
  for (const i of imgs) (dbImg[i.code] = dbImg[i.code] || []).push(i.url);
  const meta = catalogMeta();
  const byCode = {};
  for (const r of rows) {
    if (!byCode[r.code]) {
      const m = meta[r.code] || {};
      byCode[r.code] = {
        code: r.code,
        name: r.name,
        collection: r.collection,
        active: r.active,
        price_cents: r.price_cents,
        img: dbImg[r.code]?.[0] || m.img || null,
        images: dbImg[r.code] || [],
        category: m.category || productCategory({ code: r.code, name: r.name, collection: r.collection }),
        gender: m.gender || "moski",
        group: m.group || "boksarice",
        type: m.type || null,
        material: m.material || null,
        sizes: {},
        total: 0,
      };
    }
    const p = byCode[r.code];
    p.sizes[r.size] = { sku: r.sku, stock: r.stock };
    p.total += r.stock;
  }
  const products = Object.values(byCode);
  return NextResponse.json({ ok: true, sizes: SIZES, products, rows });
}

/** Popravek zaloge: delta (+/−) ali set (točna količina pri inventuri) + razlog → stock_moves. */
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const { sku, note } = body;
  const reason = REASONS.includes(body.reason) ? body.reason : "rocno";
  if (!sku) return NextResponse.json({ ok: false, message: "Manjka SKU." }, { status: 400 });
  const sql = db();
  const [cur] = await sql`SELECT stock FROM variants WHERE sku = ${sku}`;
  if (!cur) return NextResponse.json({ ok: false, message: "SKU ne obstaja." }, { status: 404 });

  let d;
  if (body.set !== undefined && body.set !== null && body.set !== "") {
    const target = parseInt(body.set, 10);
    if (!Number.isFinite(target) || target < 0 || target > 10000)
      return NextResponse.json({ ok: false, message: "Neveljavna količina." }, { status: 400 });
    d = target - cur.stock;
  } else {
    d = parseInt(body.delta, 10);
  }
  if (!Number.isFinite(d) || Math.abs(d) > 10000)
    return NextResponse.json({ ok: false, message: "Neveljaven popravek." }, { status: 400 });
  if (d === 0) return NextResponse.json({ ok: true, stock: cur.stock, unchanged: true });

  const r = await sql`UPDATE variants SET stock = GREATEST(0, stock + ${d})
    WHERE sku = ${sku} RETURNING sku, stock`;
  const real = r[0].stock - cur.stock;
  if (real !== 0)
    await sql`INSERT INTO stock_moves (sku, delta, reason, note)
      VALUES (${sku}, ${real}, ${reason}, ${note || null})`;
  return NextResponse.json({ ok: true, stock: r[0].stock });
}
