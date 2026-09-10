"use client";
import { useState } from "react";
import Link from "next/link";
import { fmt } from "../lib/i18n";

const FILTERS = ["all", "core", "limited", "sale"];

export default function ProductGrid({ products, lang, t }) {
  const [filter, setFilter] = useState("all");
  const list = products.filter((p) =>
    filter === "all" ? true :
    filter === "core" ? p.collection === "core" && !p.sale :
    filter === "limited" ? p.collection === "limited" && !p.sale :
    p.sale
  );

  return (
    <>
      <div className="filters">
        {FILTERS.map((f) => (
          <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {t[`filter_${f}`]}
          </button>
        ))}
      </div>
      <div className="rescount">{list.length} {t.rescount}</div>
      <div className="grid">
        {list.map((p) => {
          const badge = p.sale ? <span className="badge sale">{t.badge_sale}</span>
            : p.totalStock <= 2 ? <span className="badge low">{t.badge_low}</span>
            : p.collection === "limited" ? <span className="badge ltd">{t.badge_ltd}</span>
            : null;
          return (
            <Link href={`/${lang}/p/${p.slug}`} className="pcard" key={p.code}>
              <div className="pimg" style={{ backgroundImage: `url('${p.img}')` }}>{badge}</div>
              <div className="pinfo">
                <div className="pname">{p.name}</div>
                <div className="pline">{p.sale ? t.sale_line : p.collection === "limited" ? t.line_ltd : t.line_core}</div>
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
