// Kode za popust. Pravilo: velja BOLJŠI popust (koda ali paket/odprodaja), nikoli oba skupaj.

export const normCode = (c) => String(c || "").trim().toUpperCase().replace(/\s+/g, "");

/** Cena enega kosa po kodi: boljše od trenutne cene (paket/odprodaja) in redne cene −%. */
export function bestUnit(currentCents, baseCents, percent) {
  if (!percent) return currentCents;
  const withCode = Math.round(baseCents * (1 - percent / 100));
  return Math.min(currentCents, withCode);
}

/** Preveri kodo v bazi. Vrne { ok, coupon } ali { ok:false, message }. */
/** `lang`: "sl" | "en" | "hr" (za združljivost tudi boolean true = "en"). */
export async function checkCoupon(sql, code, email, subtotalCents, lang = "sl") {
  if (lang === true) lang = "en";
  else if (lang === false || !lang) lang = "sl";
  const c = normCode(code);
  const bad = (sl, e, hr) => ({ ok: false, message: lang === "en" ? e : lang === "hr" ? hr : sl });
  if (!c) return bad("Vpiši kodo.", "Enter a code.", "Upiši kod.");
  const [k] = await sql`SELECT * FROM coupons WHERE code = ${c}`;
  if (!k || !k.active) return bad("Ta koda ne obstaja ali ni več veljavna.", "This code is not valid.", "Ovaj kod ne postoji ili više ne vrijedi.");
  const now = Date.now();
  if (k.starts_at && new Date(k.starts_at).getTime() > now) return bad("Koda še ne velja.", "This code is not active yet.", "Kod još ne vrijedi.");
  if (k.expires_at && new Date(k.expires_at).getTime() < now) return bad("Koda je potekla.", "This code has expired.", "Kod je istekao.");
  if (k.min_order_cents && subtotalCents != null && subtotalCents < k.min_order_cents)
    return bad(`Koda velja za nakup nad ${(k.min_order_cents / 100).toFixed(2).replace(".", ",")} €.`, `Minimum order ${(k.min_order_cents / 100).toFixed(2)} €.`,
      `Kod vrijedi za kupnju iznad ${(k.min_order_cents / 100).toFixed(2).replace(".", ",")} €.`);
  if (k.max_uses) {
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM orders WHERE coupon_code = ${c} AND status <> 'preklicano'`;
    if (n >= k.max_uses) return bad("Koda je že porabljena.", "This code has been used up.", "Kod je već iskorišten.");
  }
  if (k.once_per_email && email) {
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM orders
      WHERE coupon_code = ${c} AND lower(email) = lower(${String(email).trim()}) AND status <> 'preklicano'`;
    if (n > 0) return bad("To kodo si že uporabil/-a.", "You have already used this code.", "Ovaj kod si već iskoristio/-la.");
  }
  return { ok: true, coupon: { code: c, percent: k.percent } };
}
