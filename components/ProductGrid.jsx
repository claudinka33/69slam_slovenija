"use client";
import { useState } from "react";
import Link from "next/link";
import { fmt } from "../lib/i18n";

const FILTERS = ["all", "core", "limited", "sale"];

export default function ProductGrid({ products, lang, t }) {
  const [filter, setFilter] = useState("all");
  const [cut, setCut] = useState("all");
  const hasHip = products.some((p) => p.cut === "hip");
  const sample = (c) => products.find((p) => p.cut === c && !p.sale && p.img) || products.find((p) => p.cut === c);
  const count = (c) => products.filter((p) => p.cut === c).length;

  const list = products
    .filter((p) => (cut === "all" ? true : p.cut === cut))
    .filter((p) =>
      filter === "all" ? true :
      filter === "core" ? p.collection === "core" && !p.sale :
      filter === "limited" ? p.collection === "limited" && !p.sale :
      p.sale
    );

  return (
    <>
      {hasHip && (
        <>
          <div className="flabel">{t.cut_label}</div>
          <div className="cuts">
            {["box", "hip"].map((c) => (
              <button key={c} className={`cutcard ${cut === c ? "active" : ""}`} onClick={() => setCut(cut === c ? "all" : c)}>
                <span className="cutimg" style={{ backgroundImage: `url('${sample(c)?.img}')` }} />
                <span className="cuttxt">
                  <b>{t[`cut_${c}`]}{c === "box" && <em>{t.cut_top}</em>}</b>
                  <span>{t[`cut_${c}_d`]}</span>
                  <small>{count(c)} {t.rescount}</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="flabel">{t.filter_label}</div>
      <div className="filters">
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {t[`filter_${f}`]}
          </button>
        ))}
        {cut !== "all" && (
          <button className="chip" onClick={() => setCut("all")}>✕ {t.cut_all}</button>
        )}
      </div>
      <div className="rescount">{list.length} {t.rescount}</div>
      <div className="grid">
        {list.map((p) => {
          const badge = p.sale ? <span className="badge sale">{t.badge_sale}</span>
            : p.totalStock <= 2 ? <span className="badge low">{t.badge_low}</span>
            : p.collection === "limited" ? <span className="badge ltd">{t.badge_ltd}</span>
            : null;
          const line = p.sale ? t.sale_line
            : p.collection === "limited" ? t.line_ltd
            : p.cut === "hip" ? t.line_hip
            : t.line_core;
          return (
            <Link href={`/${lang}/p/${p.slug}`} className="pcard" key={p.code}>
              <div className="pimg" style={{ backgroundImage: `url('${p.img}')` }}>{badge}</div>
              <div className="pinfo">
                <div className="pname">{p.name}</div>
                <div className="pline">{line}</div>
                <div className="prow">
                  {p.sale ? (
                    <span className="price red"><span className="old">{fmt(p.price)}</span>{fmt(p.effPrice)}</span>
                  ) : (
                    <span className="price">{fmt(p.price)}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
