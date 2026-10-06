"use client";
import { useCart } from "./CartContext";
import { usePromo, promoSaving } from "./usePromo";
import { fmt } from "../lib/i18n";

/** Namig v košarici — samo, ko koda res kaj prihrani (ne paket 3, ne akcija, ne pod minimumom). */
export default function PromoHint({ lang, onApply, active }) {
  const { cart, byId, subtotal } = useCart();
  const { promo, applied, apply } = usePromo();
  if (!promo || active) return null;
  const save = promoSaving(cart, byId, promo.percent);
  if (save <= 0 || subtotal < promo.min) return null;
  const en = lang === "en";
  const click = () => { apply(); onApply?.(promo.code); };
  return (
    <div className="promohint">
      <span>🎁 {en ? "With code" : "S kodo"} <b>{promo.code}</b> {en ? "you save" : "prihraniš"} <b>{fmt(save)}</b></span>
      {applied && !onApply
        ? <em>✓ {en ? "applied at checkout" : "upoštevano na blagajni"}</em>
        : <button type="button" onClick={click}>{en ? "Apply" : "Uveljavi"}</button>}
    </div>
  );
}
