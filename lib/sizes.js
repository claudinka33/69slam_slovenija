// Skupno za strežnik in brskalnik (brez node modulov).
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** Razvrsti velikosti: XS…XXXL, nato otroške (4 LET…), številke (40…), ostalo. */
export function sortSizes(list) {
  const rank = (s) => {
    const i = SIZE_ORDER.indexOf(s);
    if (i > -1) return i;
    const n = parseInt(s, 10);
    if (Number.isFinite(n)) return 100 + n;
    return 1000;
  };
  return [...list].sort((a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b)));
}

/** SKU iz kode in velikosti (presledki odstranjeni: "4 LET" → "4LET"). */
export const skuOf = (code, size) => `${code}-${String(size).replace(/\s+/g, "")}`;

/* Kopalke s številčnimi velikostmi (obseg pasu v colah): 30 = S, 32 = M, 34 = L, 36 = XL, 38 = XXL. */
export const WAIST = { 28: "XS", 30: "S", 32: "M", 34: "L", 36: "XL", 38: "XXL", 40: "XXXL" };
const isSwim = (g) => g === "kopalke";
/** Črkovna velikost (za filter in razvrščanje): pri kopalkah 34 → L, sicer nespremenjeno. */
export const sizeEq = (s, group) => (isSwim(group) && WAIST[parseInt(s, 10)] && /^\d+$/.test(String(s).trim()) ? WAIST[parseInt(s, 10)] : s);
/** Modeli kopalk, pri katerih vedno pišemo oboje: črko in številko (L · 34). */
export const BOTH_SIZES = ["SSN", "SDW", "SSW", "SSZ", "SLL", "SLX", "SSL", "SSC", "SSX"];
const NUM = Object.fromEntries(Object.entries(WAIST).map(([n, l]) => [l, n]));
/** Prikaz velikosti: pri izbranih kopalkah »L · 34«, pri ostalih kopalkah s številko »34 (L)«, sicer nespremenjeno. */
export const sizeLabel = (s, group, code = "") => {
  const e = sizeEq(s, group);
  if (BOTH_SIZES.includes(String(code).slice(0, 3).toUpperCase()) && NUM[e]) return `${e} · ${NUM[e]}`;
  return e !== s ? `${s} (${e})` : s;
};
/** Razvrsti velikosti izdelka; pri kopalkah številke med črke (32 ob M …). */
export const sortSizesFor = (list, group) => [...list].sort((a, b) => {
  const r = (s) => { const e = sizeEq(s, group); const i = SIZE_ORDER.indexOf(e); if (i > -1) return i + (e !== s ? 0.5 : 0); const n = parseInt(s, 10); return Number.isFinite(n) ? 100 + n : 1000; };
  return r(a) - r(b);
});
