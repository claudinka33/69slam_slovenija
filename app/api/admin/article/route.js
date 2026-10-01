import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { primeCatalog, getAnyProduct, defaultDescription, getRawProduct } from "../../../../lib/catalog";
import { getDict } from "../../../../lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** En artikel za urejanje v CMS. */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const code = new URL(req.url).searchParams.get("code") || "";
  const sql = db();
  await ensureSchema();
  await primeCatalog();
  const p = getAnyProduct(code);
  if (!p) return NextResponse.json({ ok: false, message: "Artikel ne obstaja." }, { status: 404 });
  const [[edit], imgs, vars, [row]] = await Promise.all([
    sql`SELECT * FROM product_edits WHERE code = ${code}`,
    sql`SELECT url FROM product_images WHERE code = ${code} ORDER BY pos`,
    sql`SELECT sku, size, stock FROM variants WHERE code = ${code}`,
    sql`SELECT cost_cents, active FROM products WHERE code = ${code}`,
  ]);
  return NextResponse.json({
    ok: true,
    product: {
      code, slug: p.slug, name: p.name, type: p.type, price: p.price, published: p.published, source: p.source,
      gender: p.gender, group: p.group, description: p.description, defaultDescription: defaultDescription(p, getDict("sl")),
      cost_cents: row?.cost_cents ?? null,
    },
    edit: edit || null,
    images: imgs.length ? imgs.map((i) => i.url) : p.images.map((i) => i.src),
    imagesFromCatalog: !imgs.length,
    variants: vars,
  });
}

/** Shrani naslov, podnaslov, opis, ceno, objavo → takoj na spletu. */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || "");
  const txt = (v, n) => { const s = String(v ?? "").trim(); return s ? s.slice(0, n) : null; };
  const name = txt(b.name, 120);
  const type = txt(b.type, 160);
  const desc = txt(b.description, 4000);
  const price = b.price === "" || b.price == null ? null : Math.round(parseFloat(String(b.price).replace(",", ".")) * 100);
  if (price != null && (!Number.isFinite(price) || price < 0 || price > 100000))
    return NextResponse.json({ ok: false, message: "Napačna cena." }, { status: 400 });
  const published = typeof b.published === "boolean" ? b.published : null;
  const sql = db();
  await ensureSchema();
  const [p] = await sql`SELECT code FROM products WHERE code = ${code}`;
  if (!p) return NextResponse.json({ ok: false, message: "Artikel ne obstaja." }, { status: 404 });
  await sql`INSERT INTO product_edits (code, name, type_sl, description, price_cents, published, updated_at)
    VALUES (${code}, ${name}, ${type}, ${desc}, ${price}, ${published}, now())
    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, type_sl = EXCLUDED.type_sl, description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents, published = EXCLUDED.published, updated_at = now()`;
  const raw = getRawProduct(code);
  const baseName = raw?.name ?? null;
  const basePrice = raw ? Math.round(raw.price * 100) : null;
  await sql`UPDATE products SET name = COALESCE(${name}, ${baseName}, name), price_cents = COALESCE(${price}, ${basePrice}, price_cents),
    active = COALESCE(${published}, active) WHERE code = ${code}`;
  revalidateTag("catalog");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, message: "Shranjeno — sprememba je na spletu." });
}
