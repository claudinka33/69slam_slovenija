// Poštnina po državah (Pošta Slovenije, cenik Mednarodni poslovni paket od 1. 6. 2026, paket do 2 kg, z DDV).
// ship = cena v €, free = brezplačna dostava od tega zneska naprej, cod = možno plačilo po povzetju.
export const COUNTRIES = [
  { code: "SI", ship: 5, free: 50, cod: true, days: "1–2", sl: "Slovenija", hr: "Slovenija", en: "Slovenia" },
  { code: "HR", ship: 8, free: 80, cod: true, days: "1–2", sl: "Hrvaška", hr: "Hrvatska", en: "Croatia" },
  { code: "AT", ship: 17.26, free: 80, days: "2–4", sl: "Avstrija", hr: "Austrija", en: "Austria" },
  { code: "DE", ship: 18.3, free: 80, days: "2–4", sl: "Nemčija", hr: "Njemačka", en: "Germany" },
  { code: "IT", ship: 24.27, free: 80, days: "4–6", sl: "Italija", hr: "Italija", en: "Italy" },
  { code: "HU", ship: 22.45, free: 80, days: "2–4", sl: "Madžarska", hr: "Mađarska", en: "Hungary" },
  { code: "BE", ship: 22.47, free: 80, days: "3–5", sl: "Belgija", hr: "Belgija", en: "Belgium" },
  { code: "NL", ship: 22.47, free: 80, days: "3–5", sl: "Nizozemska", hr: "Nizozemska", en: "Netherlands" },
  { code: "LU", ship: 22.47, free: 80, days: "3–5", sl: "Luksemburg", hr: "Luksemburg", en: "Luxembourg" },
  { code: "CZ", ship: 24.72, free: 80, days: "3–5", sl: "Češka", hr: "Češka", en: "Czechia" },
  { code: "SK", ship: 26.07, free: 80, days: "3–5", sl: "Slovaška", hr: "Slovačka", en: "Slovakia" },
  { code: "FR", ship: 31.54, free: 80, days: "3–6", sl: "Francija", hr: "Francuska", en: "France" },
  { code: "PL", ship: 31.54, free: 80, days: "3–6", sl: "Poljska", hr: "Poljska", en: "Poland" },
  { code: "DK", ship: 31.54, free: 80, days: "3–6", sl: "Danska", hr: "Danska", en: "Denmark" },
  { code: "BG", ship: 31.54, free: 80, days: "3–6", sl: "Bolgarija", hr: "Bugarska", en: "Bulgaria" },
  { code: "LT", ship: 31.54, free: 80, days: "4–7", sl: "Litva", hr: "Litva", en: "Lithuania" },
  { code: "LV", ship: 31.54, free: 80, days: "4–7", sl: "Latvija", hr: "Latvija", en: "Latvia" },
  { code: "EE", ship: 34.7, free: 80, days: "4–7", sl: "Estonija", hr: "Estonija", en: "Estonia" },
  { code: "FI", ship: 34.7, free: 80, days: "4–7", sl: "Finska", hr: "Finska", en: "Finland" },
  { code: "GR", ship: 34.7, free: 80, days: "4–7", sl: "Grčija", hr: "Grčka", en: "Greece" },
  { code: "ES", ship: 35.33, free: 80, days: "4–7", sl: "Španija", hr: "Španjolska", en: "Spain" },
  { code: "IE", ship: 36.27, free: 80, days: "4–7", sl: "Irska", hr: "Irska", en: "Ireland" },
  { code: "RO", ship: 36.58, free: 80, days: "4–7", sl: "Romunija", hr: "Rumunjska", en: "Romania" },
  { code: "SE", ship: 36.58, free: 80, days: "4–7", sl: "Švedska", hr: "Švedska", en: "Sweden" },
  { code: "PT", ship: 47.31, free: 80, days: "4–7", sl: "Portugalska", hr: "Portugal", en: "Portugal" },
];
export const COD_FEE = 1.5;
const BY = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
export const country = (code) => BY[String(code || "").toUpperCase()] || null;
/** Privzeta država glede na jezik strani (EN: stranka izbere sama). */
export const defaultCountry = (lang) => (lang === "hr" ? "HR" : lang === "en" ? "" : "SI");
/** Poštnina v € za državo in znesek (0 = brezplačno). null = država ni izbrana / ni podprta. */
export function shipFor(code, subtotal) {
  const c = country(code);
  if (!c) return null;
  if (!subtotal || subtotal >= c.free) return 0;
  return c.ship;
}
export const countryName = (code, lang) => { const c = country(code); return c ? (c[lang] || c.sl) : code || ""; };
/** Seznam za izbirnik: najprej SI, HR, nato abecedno. */
export const countryOptions = (lang) => [
  ...COUNTRIES.slice(0, 2),
  ...COUNTRIES.slice(2).sort((a, b) => (a[lang] || a.sl).localeCompare(b[lang] || b.sl, lang)),
].map((c) => ({ code: c.code, name: c[lang] || c.sl }));
