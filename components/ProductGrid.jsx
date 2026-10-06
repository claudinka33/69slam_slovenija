"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { fmt, tx } from "../lib/i18n";
import { typeLabel } from "../lib/typeLabel";
import { useCart } from "./CartContext";

const COLL = ["all", "core", "limited", "sale"];
const MEN_GROUPS = ["boksarice", "kopalke", "oblacila", "obutev", "dodatki"];
const OUT_GROUPS = ["boksarice", "perilo", "kopalke", "oblacila", "obutev"];

/** Kratka vrstica pod imenom na kartici. */
function cardLine(p, t, lang) {
  if (p.sale) return t.sale_line;
  if (p.group === "boksarice" && p.material === "mikrofibra")
    return p.collection === "limited" ? t.line_ltd : p.cut === "hip" ? t.line_hip : t.line_core;
  const seg = typeLabel(p.type, lang).split(" · ").filter(Boolean);
  if (p.outlet) return seg.slice(0, 2).join(" · ");
  return seg.length > 1 ? seg.slice(1).join(" · ") : seg[0] || "";
}

/** Podvrsta kopalk iz tipa (BOARDSHORT, ELASTIC, …) */
const SWIM_PRE = { SSM: "VOLLEY", SSB: "ELASTIC", SEB: "ELASTIC", SSN: "BOARDSHORT", SSW: "BOARDSHORT", SSZ: "BOARDSHORT", SDW: "BOARDSHORT",
  SSC: "CLASSIC", SSL: "MEDIUM", SSX: "MEDIUM", SLL: "LONG", SLX: "LONG" };
function swimKind(p) {
  const pre = String(p.code || "").slice(0, 3).toUpperCase();
  if (SWIM_PRE[pre]) return SWIM_PRE[pre];
  const tp = (p.type || "").toUpperCase();
  if (tp.includes("MAJICA")) return "MAJICE";
  for (const k of ["BOARDSHORT", "VOLLEY", "ELASTIC", "MEDIUM", "LONG", "CLASSIC"]) if (tp.includes(k)) return k;
  return "DRUGO";
}
/** Vrsta dodatka (stran Dodatki). */
function accKind(p) {
  const tp = `${p.type || ""} ${p.name || ""}`.toUpperCase();
  if (p.group === "obutev") return "OBUTEV";
  if (p.group === "oblacila") return "OBLACILA";
  if (tp.includes("OBESEK")) return "OBESKI";
  if (tp.includes("KAPA")) return "KAPE";
  if (tp.includes("NOGAVIC")) return "NOGAVICE";
  if (tp.includes("BAG") || tp.includes("TORB")) return "TORBE";
  return "DRUGO";
}
const ACC_ORDER = ["KAPE", "NOGAVICE", "OBESKI", "TORBE", "OBUTEV", "OBLACILA", "DRUGO"];
const ACC_LABEL = { sl: { KAPE: "Kape", NOGAVICE: "Nogavice", OBESKI: "Obeski za ključe", TORBE: "Torbe", OBUTEV: "Japonke & natikači", OBLACILA: "Oblačila", DRUGO: "Ostalo" },
  en: { KAPE: "Caps", NOGAVICE: "Socks", OBESKI: "Keychains", TORBE: "Bags", OBUTEV: "Flip-flops & slides", OBLACILA: "Clothing", DRUGO: "Other" },
  hr: { KAPE: "Kape", NOGAVICE: "Čarape", OBESKI: "Privjesci za ključeve", TORBE: "Torbe", OBUTEV: "Japanke i natikače", OBLACILA: "Odjeća", DRUGO: "Ostalo" } };
const SWIM_ORDER = ["ELASTIC", "BOARDSHORT", "VOLLEY", "CLASSIC", "MEDIUM", "LONG", "MAJICE", "DRUGO"];
const SWIM_TOP = new Set(["ELASTIC", "BOARDSHORT"]);
/** Izbrani dizajn za sliko modela (po imenu). */
export const SWIM_PICK = { ELASTIC: "PLAIN AQUA GREEN", BOARDSHORT: "VICE", CLASSIC: "BALI", MEDIUM: "CANDY SPLASH" };
/** Cela slika izdelka (ne detajl od blizu). */
const fullImg = (p) => (p?.images || []).map((i) => i.src).find((u) => u && !/zoom/i.test(u)) || p?.img;
const SWIM_DESC = {
  sl: { VOLLEY: "Kratke (~28 cm), 4-way stretch – za maksimalno gibanje na plaži in v vodi.",
    ELASTIC: "Elastičen pas – oblečeš in greš. V 4-way stretch in klasični elastic različici (~38 cm).",
    BOARDSHORT: "Raztegljiv 4-way stretch se giblje s tabo – za vodne športe in aktivne dni na plaži (~38 cm).",
    CLASSIC: "Klasične kopalne hlače z vrvico in ježkom, živahni printi (~36 cm).",
    MEDIUM: "Srednja dolžina do kolena – več pokritosti, sproščen videz (~46 cm).",
    LONG: "Za tiste, ki imate radi daljše kopalke (~52 cm).",
    MAJICE: "Kopalne majice z UV zaščito – za sonce in vodo.",
    DRUGO: "Ostale kopalke." },
  en: { VOLLEY: "Short (~28 cm), 4-way stretch – built for maximum movement.",
    ELASTIC: "Elastic waist – pull on and go. In 4-way stretch and classic elastic versions (~38 cm).",
    BOARDSHORT: "Stretchy 4-way fabric that moves with you – for water sports and active beach days (~38 cm).",
    CLASSIC: "Classic swim shorts with drawstring and velcro, bold prints (~36 cm).",
    MEDIUM: "Knee length – more coverage, relaxed look (~46 cm).",
    LONG: "For those who like their swim shorts longer (~52 cm).",
    MAJICE: "Swim shirts with UV protection – for sun and water.",
    DRUGO: "Other swimwear." },
  hr: { VOLLEY: "Kratki (~28 cm), 4-way stretch – za maksimalnu slobodu pokreta na plaži i u vodi.",
    ELASTIC: "Elastični pojas – obučeš i ideš. U 4-way stretch i klasičnoj elastic verziji (~38 cm).",
    BOARDSHORT: "Rastezljivi 4-way stretch kreće se s tobom – za vodene sportove i aktivne dane na plaži (~38 cm).",
    CLASSIC: "Klasične kupaće hlače s vezicom i čičkom, živahni printovi (~36 cm).",
    MEDIUM: "Srednja duljina do koljena – više pokrivenosti, opušten izgled (~46 cm).",
    LONG: "Za one koji vole duže kupaće (~52 cm).",
    MAJICE: "Kupaće majice s UV zaštitom – za sunce i vodu.",
    DRUGO: "Ostale kupaće hlače." },
};
const KIND_LABEL = { BOARDSHORT: "Boardshort", VOLLEY: "Volley", ELASTIC: "Elastic", MEDIUM: "Medium length", LONG: "Long length", CLASSIC: "Classic", MAJICE: "Kopalne majice", DRUGO: "Ostalo" };

/**
 * mode: "men" (glavna trgovina) | "swim" (moške kopalke) | "outlet" (ženske + otroci −50 %)
 */
export default function ProductGrid({ products: all, lang, t, mode = "men" }) {
  const { byId } = useCart();
  // živa zaloga iz baze: razprodani izginejo, ponovno prevzeti se vrnejo
  const products = all.map((p) => byId(p.code) || p).filter((p) => p.totalStock > 0 && (mode !== "outlet" || p.outlet || p.sale));
  const [group, setGroup] = useState(mode === "men" ? "boksarice" : "all");
  const [gender, setGender] = useState("all");
  const [kind, setKind] = useState("all");
  // ?model=BOARDSHORT ipd. (povezava s prve strani) → izbran model kopalk
  useEffect(() => {
    if (mode !== "swim" && mode !== "extra") return;
    const m = new URLSearchParams(window.location.search).get(mode === "swim" ? "model" : "vrsta");
    if (m) setKind(m.toUpperCase());
  }, [mode]);
  const [filter, setFilter] = useState("all");
  // krajše strani: najprej 12 (telefon) / 24 (računalnik), nato »Pokaži več«
  const [step, setStep] = useState(24);
  const [limit, setLimit] = useState(24);
  useEffect(() => { const n = window.innerWidth < 700 ? 12 : 24; setStep(n); setLimit(n); }, []);
  const [cut, setCut] = useState("all");

  useEffect(() => { setLimit(step); }, [group, gender, kind, filter, cut, step]);
  // samodejno nalaganje: ko se pri drsenju približaš koncu, se naloži naslednji del
  const moreRef = useRef(null);
  useEffect(() => {
    const el = moreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((en) => {
      if (en[0].isIntersecting) setLimit((l) => l + step);
    }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  });

  // ---------- osnovni nabor ----------
  let base = products;
  if (mode === "outlet" && gender !== "all") base = base.filter((p) => p.gender === gender);
  const groups = mode === "men" ? MEN_GROUPS : mode === "outlet" ? OUT_GROUPS : [];
  const scope = base;
  const gCount = (g) => scope.filter((p) => p.group === g).length;
  if (groups.length && group !== "all") base = base.filter((p) => p.group === group);

  const kindOf = mode === "extra" ? accKind : swimKind;
  const kinds = mode === "swim" ? SWIM_ORDER.filter((k) => products.some((p) => swimKind(p) === k))
    : mode === "extra" ? ACC_ORDER.filter((k) => products.some((p) => accKind(p) === k)) : [];
  if ((mode === "swim" || mode === "extra") && kind !== "all") base = base.filter((p) => kindOf(p) === kind);

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
          {["all", "moski", "zenske", "otroci"].filter((g) => g === "all" || products.some((p) => p.gender === g)).map((g) => (
            <button key={g} className={`chip ${gender === g ? "active" : ""}`} onClick={() => setGender(g)}>
              {g === "all" ? t.out_all : g === "moski" ? (t.out_men || "Moški") : g === "zenske" ? t.out_women : t.out_kids}
            </button>
          ))}
        </div>
      )}

      {groups.filter((g) => gCount(g) > 0).length > 1 && (
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

      {mode === "swim" && kinds.length > 1 && (
        <>
          <div className="flabel">{tx(lang, "Izberi model", "Pick your model", "Odaberi model")}</div>
          <div className="cuts swimcuts">
            {(() => { const used = new Set(); return kinds.map((k) => {
              const inK = products.filter((p) => swimKind(p) === k);
              // cela slika kopalk (ne detajl od blizu), vsak model drug dizajn
              const orig = (p) => all.find((x) => x.code === p.code) || p;
              const want = SWIM_PICK[k];
              const picked = want && inK.find((p) => String(p.name).toUpperCase().trim() === want)
                || want && inK.find((p) => String(p.name).toUpperCase().includes(want));
              const full = inK.filter((p) => p.img && !/zoom/i.test(p.img));
              const smp = picked || full.find((p) => !used.has(String(p.name).toUpperCase())) || full[0] || inK.find((p) => p.img) || inK[0];
              if (smp) used.add(String(smp.name).toUpperCase());
              const smpImg = smp ? fullImg(orig(smp)) : "";
              return (
                <button key={k} className={`cutcard ${kind === k ? "active" : ""}`} onClick={() => setKind(kind === k ? "all" : k)}>
                  <span className="cutimg" style={{ backgroundImage: `url('${smpImg || ""}')` }} />
                  <span className="cuttxt">
                    <b>{k === "MAJICE" ? t.swim_tops : KIND_LABEL[k]}{SWIM_TOP.has(k) && <em>{tx(lang, "Najbolj prodajan", "Best seller", "Najprodavaniji")}</em>}</b>
                    <span>{(SWIM_DESC[lang] || SWIM_DESC.sl)[k]}</span>
                    <small>{inK.length} {lang === "en" ? "designs" : lang === "hr" ? (inK.length % 10 === 1 && inK.length % 100 !== 11 ? "dizajn" : "dizajna") : inK.length === 1 ? "dizajn" : inK.length === 2 ? "dizajna" : inK.length < 5 ? "dizajni" : "dizajnov"}</small>
                  </span>
                </button>
              );
            }); })()}
          </div>
          {kind !== "all" && (
            <div className="filters" style={{ marginTop: 12 }}>
              <button className="chip" onClick={() => setKind("all")}>✕ {t.swim_all}</button>
            </div>
          )}
        </>
      )}

      {mode !== "swim" && kinds.length > 1 && (
        <div className="filters">
          <button className={`chip ${kind === "all" ? "active" : ""}`} onClick={() => setKind("all")}>{mode === "extra" ? t.grp_all : t.swim_all}</button>
          {kinds.map((k) => (
            <button key={k} className={`chip ${kind === k ? "active" : ""}`} onClick={() => setKind(k)}>
              {mode === "extra" ? (ACC_LABEL[lang] || ACC_LABEL.sl)[k] : k === "MAJICE" ? t.swim_tops : KIND_LABEL[k]}
              {mode === "extra" && <small> {products.filter((p) => accKind(p) === k).length}</small>}
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
        {list.slice(0, limit).map((p) => {
          const red = p.sale || p.outlet;
          const badge = p.outlet ? <span className="badge sale">{t.out_badge}</span>
            : p.sale ? <span className="badge sale">{t.badge_sale}</span>
            : p.totalStock <= 2 ? <span className="badge low">{t.badge_low}</span>
            : p.collection === "limited" ? <span className="badge ltd">{t.badge_ltd}</span>
            : null;
          return (
            <Link href={`/${lang}/p/${p.slug}`} className="pcard" key={p.code}>
              <div className="pimg" style={{ backgroundImage: `url('${p.img}')` }}>{badge}{p.hasSet && <span className="badge set">{tx(lang, "Komplet", "Set", "Komplet")}</span>}</div>
              <div className="pinfo">
                <div className="pname">{p.name}</div>
                <div className="pline">{cardLine(p, t, lang)}</div>
                <div className="prow">
                  {red ? (
                    <span className="price red"><span className="old">{fmt(p.price)}</span>{fmt(p.effPrice)}</span>
                  ) : (
                    <span className="price">{fmt(p.price)}</span>
                  )}
                  <span className="psizes">{(p.sizes || []).filter((s) => (p.stock?.[s] || 0) > 0).join(" ")}</span>
                </div>
                {red && <div className="pomni">{t.omni}: {fmt(p.low30 ?? p.price)}</div>}
              </div>
            </Link>
          );
        })}
      </div>
      {list.length > limit && (
        <div className="morewrap" ref={moreRef}>
          <button className="morebtn" onClick={() => setLimit(limit + step * 2)}>
            {tx(lang, "Pokaži več", "Show more", "Prikaži više")} <small>({limit} / {list.length})</small>
          </button>
        </div>
      )}
    </>
  );
}
