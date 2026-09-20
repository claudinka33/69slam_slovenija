"use client";
import { useState } from "react";
import { useCart } from "./CartContext";
import { fmt } from "../lib/i18n";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
const TXT = {
  sl: { badge: "Paket 3 · −15 %", h: "Ta print + še 2 = 15 % ceneje", sub: "Izberi velikost in še dva printa. Paket ima brezplačno dostavo.",
        size: "Velikost za vse tri", pick: "Izberi še", picked: "Izbrano", none: "V tej velikosti trenutno ni drugih printov.",
        add: "Dodaj paket v košarico", save: "prihraniš", first: "Najprej izberi velikost" },
  en: { badge: "Bundle of 3 · −15%", h: "This print + 2 more = 15% off", sub: "Pick a size and two more prints. Bundles ship free.",
        size: "Size for all three", pick: "Pick", picked: "Picked", none: "No other prints in this size right now.",
        add: "Add bundle to cart", save: "you save", first: "Pick a size first" },
};

export default function ProductBundle({ code, lang }) {
  const { products, byId, addBundle, usedInCart, BUNDLE_OFF } = useCart();
  const [size, setSize] = useState(null);
  const [picks, setPicks] = useState([]);
  const x = TXT[lang] || TXT.sl;
  const cur = byId(code);
  if (!cur || cur.sale) return null;

  const avail = (p, s) => (p.stock?.[s] || 0) - usedInCart(p.code, s);
  const sizes = SIZE_ORDER.filter((s) => avail(cur, s) > 0);
  if (sizes.length === 0) return null;

  const cands = size
    ? products
        .filter((p) => !p.sale && p.code !== code && avail(p, size) > 0)
        .sort((a, b) => (a.cut === cur.cut ? 0 : 1) - (b.cut === cur.cut ? 0 : 1))
    : [];
  const chosen = picks.map((c) => byId(c)).filter(Boolean);
  const full = cur.price + chosen.reduce((s, p) => s + p.price, 0);
  const price = +(full * (1 - BUNDLE_OFF)).toFixed(2);
  const ready = size && chosen.length === 2;

  function toggle(c) {
    setPicks((cur) => (cur.includes(c) ? cur.filter((y) => y !== c) : cur.length < 2 ? [...cur, c] : [cur[1], c]));
  }

  return (
    <div className="pbundle">
      <span className="pb-badge">{x.badge}</span>
      <h3>{x.h}</h3>
      <p>{x.sub}</p>

      <div className="plabel">{x.size}</div>
      <div className="sizes">
        {sizes.map((s) => (
          <div key={s} className={`size ${size === s ? "active" : ""}`} onClick={() => { setSize(s); setPicks([]); }}>{s}</div>
        ))}
      </div>

      <div className="pb-slots">
        <div className="pb-slot on" style={{ backgroundImage: `url('${cur.img}')` }} />
        {[0, 1].map((i) => (
          <div key={i} className={`pb-slot ${chosen[i] ? "on" : ""}`} style={chosen[i] ? { backgroundImage: `url('${chosen[i].img}')` } : undefined}
            onClick={() => chosen[i] && toggle(chosen[i].code)}>
            {!chosen[i] && <span>+</span>}
          </div>
        ))}
      </div>

      {size ? (
        cands.length ? (
          <>
            <div className="plabel">{x.pick} {Math.max(0, 2 - chosen.length)}</div>
            <div className="pb-strip">
              {cands.map((p) => (
                <button key={p.code} title={p.name} className={picks.includes(p.code) ? "sel" : ""} onClick={() => toggle(p.code)}
                  style={{ backgroundImage: `url('${p.img}')` }} aria-label={p.name} />
              ))}
            </div>
          </>
        ) : <div className="pb-note">{x.none}</div>
      ) : <div className="pb-note">{x.first}</div>}

      <div className="pb-foot">
        <div className="pb-price">
          {ready ? (<><span className="old">{fmt(full)}</span><b>{fmt(price)}</b><small>{x.save} {fmt(full - price)}</small></>) : <b>−15 %</b>}
        </div>
        <button className="checkout-btn" disabled={!ready}
          onClick={() => ready && addBundle([{ id: code, size }, ...picks.map((c) => ({ id: c, size }))])}>
          {x.add}
        </button>
      </div>
    </div>
  );
}
