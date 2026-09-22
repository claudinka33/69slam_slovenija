import { NextResponse } from "next/server";
import { dbConfigured, getStockMap } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Živa zaloga za trgovino: { CODE: { SIZE: qty } }. Brez baze vrne prazno (stran obdrži posnetek). */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, stock: null });
  try {
    const stock = await getStockMap();
    return NextResponse.json(
      { ok: true, stock },
      { headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ ok: false, stock: null });
  }
}
