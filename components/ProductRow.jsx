"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { fmt, tx } from "../lib/i18n";
import { typeLabel } from "../lib/typeLabel";

/** Vrstica manjših kartic artiklov (Kaj paše zraven / Nazadnje ogledano). */
function Row({ title, items, lang, t }) {
  if (!items.length) return null;
  return (
    <section className="prow-sec">
      <h2>{title}</h2>
      <div className="prow-list">
        {items.map((p) => {
          const red = p.effPrice < p.price;
          return (
            <Link key={p.code} href={`/${lang}/p/${p.slug}`} className="prow-card">
              <span className="prow-img" style={{ backgroundImage: `url('${p.img}')` }} />
              <b>{p.name}</b>
              <small>{typeLabel(p.type, lang).split(" · ").slice(0, 2).join(" · ")}</small>
              <span className="prow-price">{red ? <><s>{fmt(p.price)}</s> <em>{fmt(p.effPrice)}</em></> : fmt(p.price)}</span>
              {red && <span className="pomni">{t.omni}: {fmt(p.low30 ?? p.price)}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** »Kaj paše zraven« — kode pripravi strežnik, podatki (živa zaloga) iz košarice. */
export function Pairings({ codes, lang, t }) {
  const { byId } = useCart();
  const items = codes.map((c) => byId(c)).filter((p) => p && p.totalStock > 0);
  return <Row title={tx(lang, "Kaj paše zraven", "Goes well with", "Što ide uz to")} items={items} lang={lang} t={t} />;
}

const KEY = "rv69";
/** »Nazadnje ogledano« — shrani ogled tega artikla in pokaže prejšnje (samo v tem brskalniku). */
export function RecentlyViewed({ code, lang, t }) {
  const { byId } = useCart();
  const [codes, setCodes] = useState([]);
  useEffect(() => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch {}
    if (!Array.isArray(list)) list = [];
    setCodes(list.filter((c) => c !== code).slice(0, 8));
    try { localStorage.setItem(KEY, JSON.stringify([code, ...list.filter((c) => c !== code)].slice(0, 13))); } catch {}
  }, [code]);
  const items = codes.map((c) => byId(c)).filter((p) => p && p.totalStock > 0).slice(0, 6);
  return <Row title={tx(lang, "Nazadnje ogledano", "Recently viewed", "Nedavno pregledano")} items={items} lang={lang} t={t} />;
}
