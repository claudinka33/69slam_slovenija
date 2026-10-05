import { NextResponse } from "next/server";
import { dbConfigured, ensureSchema } from "../../../../lib/db";
import { getFurs, saveCert, saveFursSettings, removeCert, fursEcho, registerPremise, fiscalizeStored, ljTime } from "../../../../lib/furs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const preferredRegion = "fra1"; // FURS ne sprejema zahtev izven EU

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
    if (b.action === "remove") {
      if ((await getFurs()).settings.registered_at) return NextResponse.json({ ok: false, message: "Potrjevanje je vklopljeno — potrdilo lahko samo zamenjaš z novim (naloži novega)." }, { status: 400 });
      await removeCert(); return NextResponse.json({ ok: true, message: "Potrdilo odstranjeno." });
    }
    if (b.action === "echo") {
      const r = await fursEcho({ test: !!b.test });
      return NextResponse.json({ ok: r.ok, peer: r.peer, chain: r.chain, body: r.body, status: r.status, message: r.ok ? "Povezava s FURS deluje ✓" : `FURS odgovor ${r.status}` });
    }
    if (b.action === "register") {
      const cur = (await getFurs()).settings;
      if (cur.registered_at && !b.again) return NextResponse.json({ ok: false, message: "Poslovni prostor je že prijavljen." }, { status: 400 });
      if (b.settings) await saveFursSettings(b.settings);
      const s = (await getFurs()).settings;
      const validity = ljTime(new Date()).date;
      await registerPremise({ premise: s.premise, validity });
      await saveFursSettings({ _registered: new Date().toISOString(), _validity: validity });
      return NextResponse.json({ ok: true, message: `Poslovni prostor ${s.premise} je prijavljen pri FURS ✓ — davčno potrjevanje je vklopljeno.` });
    }
    if (b.action === "retry" && b.id) {
      const u = await fiscalizeStored(b.id, { subsequent: true });
      return NextResponse.json({ ok: !!u?.eor, message: u?.eor ? `Potrjeno ✓ EOR ${u.eor}` : `Ni uspelo: ${u?.furs_error || "neznano"}` });
    }
    const clean = Object.fromEntries(Object.entries(b.settings || {}).filter(([k]) => !k.startsWith("_")));
    return NextResponse.json({ ok: true, settings: await saveFursSettings(clean), message: "Shranjeno ✓" });
  } catch (e) {
    return NextResponse.json({ ok: false, message: String(e?.message || e).slice(0, 200) }, { status: 400 });
  }
}
