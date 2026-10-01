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
