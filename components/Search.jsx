"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./CartContext";
import { fmt, tx } from "../lib/i18n";
import { typeLabel } from "../lib/typeLabel";

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// pogovorne besede → kaj iščemo v tipu artikla
const SYN = { spodnjice: "spodnje perilo", boksarice: "spodnje perilo", gate: "spodnje perilo", gace: "spodnje perilo", bokserice: "spodnje perilo",
  kopalke: "kopal", kopalne: "kopal", bikini: "kopalke", majica: "majica", kapa: "kapa", kape: "kapa", nogavice: "nogavic",
  obesek: "obesek", obeski: "obesek", japonke: "japonke", natikaci: "natikac", microfibra: "mikrofibra", micro: "mikrofibra",
  bamboo: "bambus", boardshorts: "boardshort", underwear: "spodnje perilo", swimwear: "kopal", socks: "nogavic", cap: "kapa", caps: "kapa",
  kupaci: "kopal", kupace: "kopal", carape: "nogavic", privjesak: "obesek", privjesci: "obesek", japanke: "japonke", natikace: "natikac", bambus: "bambus" };

/** Iskalnik: po šifri (tudi z velikostjo), nazivu, vzorcu, modelu, materialu, kroju. */
export default function Search({ lang }) {
  const { products } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inp = useRef(null);
  useEffect(() => { if (open) setTimeout(() => inp.current?.focus(), 30); }, [open]);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const index = useMemo(() => (products || []).map((p) => ({ p,
    code: norm(p.code), hay: norm(`${p.code} ${p.name} ${p.type || ""} ${p.material || ""} ${p.cut || ""} ${p.collection === "limited" ? "limited edition" : ""} ${p.gender === "zenske" ? "zenske" : p.gender === "otroci" ? "otroci otroske" : "moske"}`) })), [products]);

  const res = useMemo(() => {
    const words = norm(q).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const out = [];
    for (const it of index) {
      if ((it.p.totalStock || 0) <= 0) continue;
      let score = 0, ok = true;
      for (const w0 of words) {
        const w = w0.replace(/-(xs|s|m|l|xl|xxl|xxxl|\d+)$/i, ""); // šifra z velikostjo (MBYABT-M)
        const syn = SYN[w];
        if (it.code === w) score += 100;
        else if (it.code.startsWith(w) && w.length >= 3) score += 40;
        else if (it.hay.includes(w) || (syn && it.hay.includes(syn))) score += norm(it.p.name).includes(w) ? 10 : 3;
        else { ok = false; break; }
      }
      if (ok) out.push([score, it.p]);
    }
    return out.sort((a, b) => b[0] - a[0] || (b[1].totalStock || 0) - (a[1].totalStock || 0)).slice(0, 60).map((x) => x[1]);
  }, [q, index]);

  return (
    <>
      <button className="srchbtn" aria-label={tx(lang, "Iskanje", "Search", "Pretraživanje")} onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
      {open && (
        <div className="srch-ov" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="srch-box">
            <div className="srch-top">
              <input ref={inp} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tx(lang, "Išči po imenu, vzorcu, šifri, modelu …", "Search by name, print, code, model …", "Traži po nazivu, uzorku, šifri, modelu …")} />
              <button onClick={() => setOpen(false)} aria-label={tx(lang, "Zapri", "Close", "Zatvori")}>✕</button>
            </div>
            {q.trim() && <div className="srch-count">{res.length ? `${res.length}${res.length === 60 ? "+" : ""} ${tx(lang, "zadetkov", "results", "rezultata")}` : tx(lang, "Ni zadetkov — poskusi z drugo besedo.", "No results — try another word.", "Nema rezultata — pokušaj s drugom riječi.")}</div>}
            {!q.trim() && <div className="srch-hint">{tx(lang, "npr. flamingo · MBYABT · boardshort · bambus hip · kapa", "e.g. flamingo · MBYABT · boardshort · bamboo hip · cap", "npr. flamingo · MBYABT · boardshort · bambus hip · kapa")}</div>}
            <div className="srch-res">
              {res.map((p) => {
                const red = p.sale || p.outlet;
                return (
                  <Link key={p.code} href={`/${lang}/p/${p.slug}`} className="srch-item" onClick={() => setOpen(false)}>
                    <span className="srch-img" style={{ backgroundImage: `url('${p.img}')` }} />
                    <span className="srch-txt">
                      <b>{p.name}</b>
                      <small>{typeLabel(p.type, lang)} · {p.code}</small>
                    </span>
                    <span className="srch-price">{red ? <><s>{fmt(p.price)}</s> <em>{fmt(p.effPrice)}</em></> : fmt(p.price)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
