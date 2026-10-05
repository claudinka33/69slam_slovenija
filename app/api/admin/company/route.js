import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Podatki podjetja po davčni številki: ?vat=12345678 (ali SI12345678).
 * Vir: EU register zavezancev za DDV (VIES) — isti podatki kot pri FURS/AJPES za davčne zavezance.
 */
export async function GET(req) {
  const u = new URL(req.url);
  const raw = String(u.searchParams.get("vat") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = raw.match(/^([A-Z]{2})?(\d{8,12})$/);
  if (!m) return NextResponse.json({ ok: false, message: "Vpiši davčno številko (8 številk, npr. 12345678)." }, { status: 400 });
  const cc = m[1] && m[1] !== "EL" ? m[1] : m[1] || "SI";
  const num = m[2];
  try {
    const r = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${num}`, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(12000) });
    const d = await r.json().catch(() => null);
    if (!d) return NextResponse.json({ ok: false, message: "Register se ne odziva — poskusi čez minuto ali vpiši ročno." }, { status: 502 });
    if (!d.isValid) return NextResponse.json({ ok: false, vat: `${cc}${num}`, message: "Te številke ni med zavezanci za DDV (pogosto pri manjših s.p.). Podatke vpiši ročno." });
    const name = String(d.name || "").replace(/\s+/g, " ").trim();
    const lines = String(d.address || "").split(/\n|,(?=[^,]*$)/).map((s) => s.trim()).filter(Boolean);
    let address = lines[0] || "", zip_city = lines.slice(1).join(" ");
    if (!zip_city) { const z = address.match(/^(.*?)[, ]+(\d{4}\s+.*)$/); if (z) { address = z[1]; zip_city = z[2]; } }
    return NextResponse.json({ ok: true, company: { name, address: address.replace(/,\s*$/, ""), zip_city, vat: `${cc}${num}`, country: cc === "SI" ? "Slovenija" : cc } });
  } catch {
    return NextResponse.json({ ok: false, message: "Register se ne odziva — poskusi čez minuto ali vpiši ročno." }, { status: 502 });
  }
}
