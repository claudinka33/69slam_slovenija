import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../../lib/db";
import { getFurs, saveCert, saveFursSettings, removeCert } from "../../../../lib/furs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Podatki o naloženem potrdilu (brez ključa in gesla) + nastavitve potrjevanja. */
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false });
  await ensureSchema();
  return NextResponse.json({ ok: true, ...(await getFurs()) });
}

/** multipart: file (.p12) + password → shrani šifrirano | JSON { settings } → shrani nastavitve */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  try {
    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const f = await req.formData();
      const file = f.get("file");
      const password = String(f.get("password") || "");
      if (!file || typeof file.arrayBuffer !== "function" || !file.size) return NextResponse.json({ ok: false, message: "Izberi datoteko .p12." }, { status: 400 });
      if (file.size > 50000) return NextResponse.json({ ok: false, message: "Datoteka je prevelika za potrdilo." }, { status: 400 });
      if (!password) return NextResponse.json({ ok: false, message: "Vpiši geslo potrdila." }, { status: 400 });
      const info = await saveCert(Buffer.from(await file.arrayBuffer()), password, file.name);
      return NextResponse.json({ ok: true, info, message: `Potrdilo naloženo in varno shranjeno ✓ (velja do ${new Date(info.valid_to).toLocaleDateString("sl-SI")})` });
    }
    const b = await req.json().catch(() => ({}));
    if (b.action === "remove") { await removeCert(); return NextResponse.json({ ok: true, message: "Potrdilo odstranjeno." }); }
    return NextResponse.json({ ok: true, settings: await saveFursSettings(b.settings || {}), message: "Shranjeno ✓" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e?.message || e).slice(0, 200) }, { status: 400 });
  }
}
