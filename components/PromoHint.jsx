"use client";
import { useCart } from "./CartContext";
import { usePromo, promoSaving } from "./usePromo";
import { fmt, tx } from "../lib/i18n";

/** Namig v košarici — samo, ko koda res kaj prihrani (ne paket 3, ne akcija, ne pod minimumom). */
export default function PromoHint({ lang, onApply, active }) {
  const { cart, byId, subtotal } = useCart();
  const { promo, applied, apply } = usePromo();
  if (!promo || active) return null;
  const save = promoSaving(cart, byId, promo.percent);
  if (save <= 0 || subtotal < promo.min) return null;
  const click = () => { apply(); onApply?.(promo.code); };
  return (
    <div className="promohint">
      <span>🎁 {tx(lang, "S kodo", "With code", "S kodom")} <b>{promo.code}</b> {tx(lang, "prihraniš", "you save", "uštediš")} <b>{fmt(save)}</b></span>
      {applied && !onApply
        ? <em>✓ {tx(lang, "upoštevano na blagajni", "applied at checkout", "primijenjeno na blagajni")}</em>
        : <button type="button" onClick={click}>{tx(lang, "Uveljavi", "Apply", "Primijeni")}</button>}
    </div>
  );
}
