"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { fmt, tx } from "../lib/i18n";
import { typeLabel } from "../lib/typeLabel";
import { sizeLabel } from "../lib/sizes";

/** »Dopolni komplet« — ujemajoči kosi istega dizajna z izbiro velikosti. */
export default function CompleteSet({ codes, lang, t }) {
  const { byId, addItem, usedInCart, showToast } = useCart();
  const items = codes.map((c) => byId(c)).filter((p) => p && p.totalStock > 0);
  if (!items.length) return null;
  return (
    <div className="cset">
      <div className="cset-h">{tx(lang, "Dopolni komplet", "Complete the set", "Upotpuni komplet")}<span>{tx(lang, "Isti dizajn — izberi svojo velikost", "Same design — pick your size", "Isti dizajn — odaberi svoju veličinu")}</span></div>
      {items.map((p) => <SetItem key={p.code} p={p} lang={lang} t={t} addItem={addItem} usedInCart={usedInCart} showToast={showToast} />)}
    </div>
  );
}

function SetItem({ p, lang, t, addItem, usedInCart, showToast }) {
  const [size, setSize] = useState(null);
  const red = p.effPrice < p.price;
  const seg = typeLabel(p.type, lang).split(" · ").filter(Boolean);
  return (
    <div className="cset-item">
      <Link href={`/${lang}/p/${p.slug}`} className="cset-img" style={{ backgroundImage: `url('${p.img}')` }} aria-label={p.name} />
      <div className="cset-body">
        <Link href={`/${lang}/p/${p.slug}`} className="cset-name">{p.name}</Link>
        <div className="cset-type">{seg.slice(1).join(" · ") || seg[0]}</div>
        <div className="cset-price">{red ? <><s>{fmt(p.price)}</s> <b className="red">{fmt(p.effPrice)}</b></> : <b>{fmt(p.price)}</b>}
          <span className="omni">{t.omni}: {fmt(p.low30 ?? p.price)}</span></div>
        <div className="cset-sizes">
          {p.sizes.filter((s) => (p.stock[s] || 0) > 0).map((s) => {
            const avail = (p.stock[s] || 0) - usedInCart(p.code, s);
            return <button type="button" key={s} disabled={avail <= 0} className={size === s ? "on" : ""} onClick={() => setSize(s)}>{sizeLabel(s, p.group, p.code)}</button>;
          })}
        </div>
        <button type="button" className="cset-add" onClick={() => {
          if (!size) { showToast(t.choose_size); return; }
          if (addItem(p.code, size)) showToast(t.added);
        }}>{tx(lang, "Dodaj v košarico", "Add to cart", "Dodaj u košaricu")}</button>
      </div>
    </div>
  );
}
