// Povezava s portalom Pošte Slovenije (oddaj.mojpaket.si) — enako kot uradni WooCommerce vtičnik PS Moj paket v4.5.0.
// Naročilo se pošlje v portal, tam se izbere storitev, natisnejo nalepke in odda; sledilno številko preberemo nazaj (GetStatus).
// Žeton: Vercel → Settings → Environment Variables → POSTA_TOKEN (TOKEN iz maila PS Moj paket).

const BASE = process.env.POSTA_URL || "https://ec-komunikator.appservice.azuremb.posta.si/api/PSMPorder";
const WEIGHT_G = 2000; // vsi paketi so »mini paket do 2 kg« — Pošta jih stehta sama

export const postaConfigured = () => Boolean(process.env.POSTA_TOKEN);

const pad = (n) => String(n).padStart(2, "0");
/** Datum naročila kot ga pričakuje portal: »YYYY-MM-DD HH:mm:ss« (slovenski čas). */
function portalDate(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Ljubljana", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === "24" ? "00" : p.hour}:${p.minute}:${p.second}`;
}
const money = (cents) => String(Math.round(Number(cents || 0)) / 100);

/** Ključ naročila v portalu (št. naročila + datum) — enak pri pošiljanju in pri preverjanju stanja. */
export function postaRef(o) {
  if (o.posta_ref?.id && o.posta_ref?.date) return o.posta_ref;
  return { id: String(o.number), date: portalDate(o.created_at) };
}
const url = (path, ref) =>
  `${BASE}${path}?token=${encodeURIComponent(process.env.POSTA_TOKEN || "")}&idnarocila=${encodeURIComponent(ref.id)}&datumnarocila=${encodeURIComponent(ref.date)}`;

/** Podatki paketa za portal (polja kot v vtičniku). */
export function postaPayload(o) {
  const cod = o.payment === "cod";
  let address = String(o.address || "").replace(/\s+/g, " ").trim();
  if (address.length > 49) address = address.slice(0, 49);
  return {
    Naziv1: String(o.name || "").trim(),
    Naziv2: "",
    Naslov: address,
    Posta: String(o.city || "").trim(),
    PostnaSt: String(o.zip || "").trim(),
    Drzava: String(o.country || "SI").toUpperCase(),
    Email: String(o.email || "").trim(),
    Telefon: String(o.phone || "").trim(),
    Teza: WEIGHT_G,
    Odkupnina: money(o.total_cents),
    Vrednost: money(Number(o.total_cents || 0) - Number(o.shipping_cents || 0) - Number(o.cod_fee_cents || 0)),
    CashOnDelivery: cod ? 1 : 0,
    Opomba: `69SLAM #${o.number}`.slice(0, 40),
  };
}

/** Pošlje naročilo v portal. Vrne { ok, ref, message }. */
export async function postaSend(o) {
  if (!postaConfigured()) return { ok: false, message: "Žeton Pošte (POSTA_TOKEN) ni nastavljen v Vercelu." };
  const ref = postaRef(o);
  let res, text = "";
  try {
    res = await fetch(url("", ref), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postaPayload(o)),
      signal: AbortSignal.timeout(20000),
    });
    text = await res.text().catch(() => "");
  } catch (e) {
    return { ok: false, ref, message: "Pošta se ne odziva: " + (e?.message || e) };
  }
  if (!res.ok) return { ok: false, ref, message: `Pošta je zavrnila naročilo (HTTP ${res.status}) ${clean(text).slice(0, 200)}` };
  return { ok: true, ref, message: clean(text).slice(0, 300) };
}

/** Odstrani JS/HTML in pusti berljivo besedilo. */
function clean(t) {
  return String(t || "")
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// sledilne številke Pošte: 2 črki + 9 števk + 2 črki (npr. PE123456789SI); izločimo nize, ki so del daljših kod
const TRACK_RE = /(?<![A-Z0-9])([A-Z]{2}\d{9}[A-Z]{2})(?![A-Z0-9])/;

/** Prebere stanje naročila v portalu. Vrne { ok, tracking, text }. */
export async function postaStatus(o) {
  if (!postaConfigured()) return { ok: false, text: "Žeton Pošte ni nastavljen." };
  const ref = postaRef(o);
  let raw = "";
  try {
    const res = await fetch(url("/GetStatus", ref), { signal: AbortSignal.timeout(20000) });
    raw = await res.text();
    if (!res.ok) return { ok: false, text: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, text: "Pošta se ne odziva: " + (e?.message || e) };
  }
  const m = raw.toUpperCase().match(TRACK_RE);
  const text = clean(raw);
  return { ok: true, tracking: m ? m[1] : null, text: text.slice(0, 400), raw: raw.slice(0, 4000) };
}
