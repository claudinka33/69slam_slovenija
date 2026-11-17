import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../../lib/db";
import { WAREHOUSES, consignList, consignImport, consignSet, consignReturn } from "../../../../lib/consign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** ?wh=samana → zaloga + zadnji premiki */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, rows: [], moves: [] });
  await ensureSchema();
  const wh = new URL(req.url).searchParams.get("wh") || "samana";
  if (!WAREHOUSES[wh]) return NextResponse.json({ ok: false, message: "Neznano skladišče." }, { status: 400 });
  const r = await consignList(wh);
  return NextResponse.json({ ok: true, wh, name: WAREHOUSES[wh], warehouses: WAREHOUSES, ...r });
}

/** { action: "import" | "set" | "return", wh, ... } */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  const b = await req.json().catch(() => ({}));
  const wh = b.wh || "samana";
  if (!WAREHOUSES[wh]) return NextResponse.json({ ok: false, message: "Neznano skladišče." }, { status: 400 });
  try {
    if (b.action === "import") {
      const r = await consignImport(wh, b.rows, b.note || "Uvoz zaloge iz tabele");
      return NextResponse.json({ ok: true, message: `Uvoženo: ${r.n} artiklov · ${r.pcs} kos na zalogi ${WAREHOUSES[wh]} ✓` });
    }
    if (b.action === "set") {
      await consignSet(wh, b.sku, b.qty, b.note);
      return NextResponse.json({ ok: true, message: `${b.sku}: zaloga nastavljena na ${b.qty} ✓` });
    }
    if (b.action === "return") {
      const r = await consignReturn(wh, b.items, b.note);
      let message = r.ok.length ? `Vrnjeno v glavno skladišče: ${r.ok.length} artiklov ✓` : "Nič ni bilo vrnjeno.";
      if (r.unknown.length) message += ` · ⚠️ teh artiklov ni v katalogu, ostanejo pri ${WAREHOUSES[wh]}: ${r.unknown.join(", ")}`;
      return NextResponse.json({ ok: true, message, ...r });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Napaka: " + String(e?.message || e).slice(0, 200) }, { status: 500 });
  }
  return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
}
