import { NextResponse } from "next/server";
import { getPoints } from "../../../../lib/postaPoints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Prevzemna mesta Pošte za blagajno (kompaktno, predpomnjeno 12 ur). */
export async function GET() {
  try {
    const points = await getPoints();
    return NextResponse.json({ ok: true, points }, {
      headers: { "Cache-Control": points.length ? "public, s-maxage=43200, stale-while-revalidate=86400" : "no-store" },
    });
  } catch (e) {
    console.error("[posta points]", e);
    return NextResponse.json({ ok: false, points: [] }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
