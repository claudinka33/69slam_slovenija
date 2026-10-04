import { NextResponse } from "next/server";
import { dbConfigured } from "../../../../lib/db";
import { prepareMk, writeMk } from "../../../../lib/mkimport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Uvoz arhiva iz Metakocke. multipart: seznam, podrobno, nabava (xlsx) + action = "preveri" | "uvozi".
 * »preveri« ne zapiše ničesar — vrne samo povzetek.
 */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  try {
    const f = await req.formData();
    const buf = async (k) => { const x = f.get(k); return x && typeof x.arrayBuffer === "function" && x.size ? Buffer.from(await x.arrayBuffer()) : null; };
    const files = { seznam: await buf("seznam"), podrobno: await buf("podrobno"), nabava: await buf("nabava") };
    if (!files.seznam && !files.nabava) return NextResponse.json({ ok: false, message: "Izberi vsaj seznam računov ali nabavne račune." }, { status: 400 });
    if (files.podrobno && !files.seznam) return NextResponse.json({ ok: false, message: "Za postavke potrebujem tudi seznam računov." }, { status: 400 });
    const prep = await prepareMk(files);
    if (f.get("action") !== "uvozi") {
      const sample = [prep.invoices.find((i) => i.order_id), prep.invoices.find((i) => !i.order_id && !i.meta.shop), prep.invoices.find((i) => i.kind === "dobropis")]
        .filter(Boolean).map((i) => ({ number: i.number, kind: i.kind, customer: i.customer_name, total_cents: i.total_cents, items: i.items.length, shop: i.meta.shop, linked: !!i.order_id }));
      return NextResponse.json({ ok: true, dry: true, summary: prep.summary, sample, has: { seznam: !!files.seznam, podrobno: !!files.podrobno, nabava: !!files.nabava } });
    }
    const w = await writeMk(prep);
    return NextResponse.json({ ok: true, summary: prep.summary, written: w,
      message: `Uvoženo ✓ ${w.invoices} dokumentov v arhiv${w.receipts ? ` in ${w.receipts} prevzemov (zaloga ni spremenjena)` : ""}.` });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Napaka: " + String(e?.message || e).slice(0, 300) }, { status: 500 });
  }
}
