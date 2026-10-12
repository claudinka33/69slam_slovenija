// Prevzemna mesta Pošte Slovenije (paketomati, poslovalnice, bencinski servisi, Direct4me paketniki).
// Seznam pride iz istega vira kot okno »Uredi dostavo« v uradnem vtičniku PS Moj paket.

const MODAL = "https://ec-komunikator.appservice.azuremb.posta.si/api/PSMPmodal/show";
const GUID = () => process.env.POSTA_GUID || "B54C873F-A660";

/** VrstaEnote → naša vrsta: paketomat (PS paketomat + Direct4me paketnik), posta (poslovalnica), bs (bencinski servis). */
export function kindOf(vrsta) {
  const v = Number(vrsta);
  if (v === 2 || v === 444 || v === 445) return "paketomat";
  if (v === 1 || v === 4) return "bs";
  if (v === 99) return "posta";
  return null;
}

let cache = null; // { at, points }
const TTL = 12 * 3600 * 1000;

/** Vrne seznam aktivnih prevzemnih mest: [{ k, v, id, n, a, z, c, lat, lng, h }]. */
export async function getPoints() {
  if (cache && Date.now() - cache.at < TTL) return cache.points;
  const token = process.env.POSTA_TOKEN;
  if (!token) return [];
  const url = `${MODAL}?token=${encodeURIComponent(token)}&guid=${encodeURIComponent(GUID())}&naslov=&PostnaStevilka=&Mesto=&apikey=`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error("Pošta: HTTP " + res.status);
  const text = await res.text();
  if (text.includes("PSNAPAKA")) throw new Error("Pošta: napaka pri prevzemnih mestih");
  const seen = new Set();
  const points = [];
  for (const m of text.matchAll(/\{"Id":\d+,"VrstaEnote":\d+,[^{}]*\}/g)) {
    let p;
    try { p = JSON.parse(m[0]); } catch { continue; }
    if (!p.Aktivnost) continue;
    const k = kindOf(p.VrstaEnote);
    if (!k) continue;
    const name = String(p.Naziv || "").trim();
    if (!name || name.startsWith("(")) continue; // npr. »(za stanovalce)« — zasebni paketniki
    const key = `${p.VrstaEnote}|${p.EnotaId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({
      k, v: Number(p.VrstaEnote), id: String(p.EnotaId), n: name,
      a: String(p.Naslov || "").trim(), z: String(p.PostaId || "").trim(), c: String(p.PostaNaziv || "").trim(),
      lat: Number(p.Latitude) || null, lng: Number(p.Longitude) || null,
      h: String(p.OdpiralniCas || "").trim(),
    });
  }
  if (points.length) cache = { at: Date.now(), points };
  return points;
}

/** Poišče prevzemno mesto po vrsti in ID (preverjanje izbire kupca na strežniku). */
export async function findPoint(v, id) {
  const list = await getPoints().catch(() => []);
  return list.find((p) => p.v === Number(v) && p.id === String(id)) || null;
}

/** Kako portal prepozna prevzemno mesto (enako kot vtičnik): 2. naziv + naslov + poštna št. prevzemnega mesta. */
export function portalAddress(p) {
  const naziv2 = p.v === 444 || p.v === 445 ? `Direct4me - ${p.n}` : p.k === "posta" ? "Poštno ležeče" : p.n;
  return { Naziv2: naziv2.slice(0, 60), Naslov: String(p.a).slice(0, 49), PostnaSt: p.z, Posta: p.c };
}
