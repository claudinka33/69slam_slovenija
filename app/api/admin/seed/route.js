import { NextResponse } from "next/server";
import { dbConfigured, seedFromCatalog } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!dbConfigured())
    return NextResponse.json({ ok: false, message: "Baza še ni povezana (DATABASE_URL manjka). Najprej v Vercelu ustvari Neon bazo." }, { status: 503 });
  try {
    const r = await seedFromCatalog();
    return NextResponse.json({ ok: true, message: `Uvoz končan: ${r.products} izdelkov, ${r.newVariants} novih variant (obstoječa zaloga je ostala nedotaknjena).` });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Napaka pri uvozu: " + String(e?.message || e) }, { status: 500 });
  }
}
