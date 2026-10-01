"use client";
import { useState } from "react";
import Link from "next/link";
import { fmt } from "../lib/i18n";
import { useCart } from "./CartContext";

const COLL = ["all", "core", "limited", "sale"];
const MEN_GROUPS = ["boksarice", "kopalke", "oblacila", "obutev", "dodatki"];
const OUT_GROUPS = ["perilo", "kopalke", "oblacila", "obutev"];

/** Kratka vrstica pod imenom na kartici. */
function cardLine(p, t) {
  if (p.sale) return t.sale_line;
  if (p.group === "boksarice" && p.material === "mikrofibra")
    return p.collection === "limited" ? t.line_ltd : p.cut === "hip" ? t.line_hip : t.line_core;
  const seg = (p.type || "").split(" · ").filter(Boolean);
  if (p.outlet) return seg.slice(0, 2).join(" · ");
  return seg.length > 1 ? seg.slice(1).join(" · ") : seg[0] || "";
}

/** Podvrsta kopalk iz tipa (BOARDSHORT, ELASTIC, …) */
function swimKind(p) {
  const tp = (p.type || "").toUpperCase();
  if (tp.includes("MAJICA")) return "MAJICE";
  for (const k of ["BOARDSHORT", "VOLLEY", "ELASTIC", "MEDIUM", "LONG", "CLASSIC"]) if (tp.includes(k)) return k;
  return "DRUGO";
}
const KIND_LABEL = { BOARDSHORT: "Boardshort", VOLLEY: "Volley", ELASTIC: "Elastic", MEDIUM: "Medium length", LONG: "Long length", CLASSIC: "Classic", MAJICE: "Kopalne majice", DRUGO: "Ostalo" };

/**
 * mode: "men" (glavna trgovina) | "swim" (moške kopalke) | "outlet" (ženske + otroci −50 %)
 */
export default function ProductGrid({ products: all, lang, t, mode = "men" }) {
  const { byId } = useCart();
  // živa zaloga iz baze: razprodani izginejo, ponovno prevzeti se vrnejo
  const products = all.map((p) => byId(p.code) || p).filter((p) => p.totalStock > 0);
  const [group, setGroup] = useState(mode === "men" ? "boksarice" : "all");
  const [gender, setGender] = useState("all");
  const [kind, setKind] = useState("all");
  const [filter, setFilter] = useState("all");
  const [cut, setCut] = useState("all");

  // ---------- osnovni nabor ----------
  let base = products;
  if (mode === "outlet" && gender !== "all") base = base.filter((p) => p.gender === gender);
  const groups = mode === "men" ? MEN_GROUPS : mode === "outlet" ? OUT_GROUPS : [];
  const scope = base;
  const gCount = (g) => scope.filter((p) => p.group === g).length;
  if (groups.length && group !== "all") base = base.filter((p) => p.group === group);

  const kinds = mode === "swim" ? [...new Set(products.map(swimKind))] : [];
  if (mode === "swim" && kind !== "all") base = base.filter((p) => swimKind(p) === kind);

  const boxers = mode === "men" && group === "boksarice";
  const hasHip = boxers && base.some((p) => p.cut === "hip");
  const sample = (c) => base.find((p) => p.cut === c && !p.sale && p.img) || base.find((p) => p.cut === c);
  const count = (c) => base.filter((p) => p.cut === c).length;

  let list = base;
  if (boxers) {
    list = list
      .filter((p) => (cut === "all" ? true : p.cut === cut))
      .filter((p) =>
        filter === "all" ? true :
        filter === "core" ? p.collection === "core" && !p.sale :
        filter === "limited" ? p.collection === "limited" && !p.sale :
        p.sale
      );
  }

  return (
    <>
      {mode === "outlet" && (
        <div className="filters">
          {["all", "zenske", "otroci"].map((g) => (
            <button key={g} className={`chip ${gender === g ? "active" : ""}`} onClick={() => setGender(g)}>
              {g === "all" ? t.out_all : g === "zenske" ? t.out_women : t.out_kids}
            </button>
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <>
          <div className="flabel">{t.cat_label}</div>
          <div className="filters catrow">
            {mode !== "men" && (
              <button className={`chip ${group === "all" ? "active" : ""}`} onClick={() => setGroup("all")}>{t.grp_all}</button>
            )}
            {groups.filter((g) => gCount(g) > 0).map((g) => (
              <button key={g} className={`chip ${group === g ? "active" : ""}`} onClick={() => { setGroup(g); setCut("all"); setFilter("all"); }}>
                {t[`grp_${g}`]} <small>{gCount(g)}</small>
              </button>
            ))}
          </div>
        </>
      )}

      {kinds.length > 1 && (
        <div className="filters">
          <button className={`chip ${kind === "all" ? "active" : ""}`} onClick={() => setKind("all")}>{t.swim_all}</button>
          {kinds.map((k) => (
            <button key={k} className={`chip ${kind === k ? "active" : ""}`} onClick={() => setKind(k)}>
              {k === "MAJICE" ? t.swim_tops : KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}

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
      {boxers && (
        <>
          <div className="flabel">{t.filter_label}</div>
          <div className="filters">
            {COLL.map((f) => (
              <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                {t[`filter_${f}`]}
              </button>
            ))}
            {cut !== "all" && (
              <button className="chip" onClick={() => setCut("all")}>✕ {t.cut_all}</button>
            )}
          </div>
        </>
      )}

      <div className="rescount">{list.length} {boxers ? t.rescount : t.items}</div>
      <div className="grid">
        {list.map((p) => {
          const red = p.sale || p.outlet;
          const badge = p.outlet ? <span className="badge sale">{t.out_badge}</span>
            : p.sale ? <span className="badge sale">{t.badge_sale}</span>
            : p.totalStock <= 2 ? <span className="badge low">{t.badge_low}</span>
            : p.collection === "limited" ? <span className="badge ltd">{t.badge_ltd}</span>
            : null;
          return (
            <Link href={`/${lang}/p/${p.slug}`} className="pcard" key={p.code}>
              <div className="pimg" style={{ backgroundImage: `url('${p.img}')` }}>{badge}</div>
              <div className="pinfo">
                <div className="pname">{p.name}</div>
                <div className="pline">{cardLine(p, t)}</div>
                <div className="prow">
                  {red ? (
                    <span className="price red"><span className="old">{fmt(p.price)}</span>{fmt(p.effPrice)}</span>
                  ) : (
                    <span className="price">{fmt(p.price)}</span>
                  )}
                  <span className="psizes">{(p.sizes || []).filter((s) => (p.stock?.[s] || 0) > 0).join(" ")}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
