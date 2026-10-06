"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePromo } from "./usePromo";
import { tx } from "../lib/i18n";

const SEEN = "promo69_seen";

/** Majhen drsnik v kotu po 15 s — enkrat na obiskovalca, dokler koda velja. */
export default function PromoSlide({ lang }) {
  const { promo, applied, apply } = usePromo();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const path = usePathname() || "";

  useEffect(() => {
    if (!promo || applied) return;
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN); } catch {}
    if (seen) return;
    // po 15 s — a šele, ko je okno za piškotke zaprto
    let iv;
    const tm = setTimeout(() => {
      const go = () => { if (!document.querySelector(".ck69")) { clearInterval(iv); setShow(true); } };
      iv = setInterval(go, 2000); go();
    }, 15000);
    return () => { clearTimeout(tm); clearInterval(iv); };
  }, [promo, applied]);

  if (!show || !promo || /\/(blagajna|kosarica|ocena|odjava)/.test(path)) return null;

  const close = () => { try { localStorage.setItem(SEEN, "1"); } catch {} setShow(false); };
  const take = () => { apply(); setDone(true); try { localStorage.setItem(SEEN, "1"); } catch {} setTimeout(() => setShow(false), 2500); };

  return (
    <div className="promoslide" role="dialog" aria-label={tx(lang, "Popust", "Discount", "Popust")}>
      <button className="x" onClick={close} aria-label={tx(lang, "Zapri", "Close", "Zatvori")}>✕</button>
      {done ? (
        <p className="ok">✓ {tx(lang, "Popust je shranjen — upoštevan bo v košarici.", "Discount saved — it will be applied in your cart.", "Popust je spremljen — bit će primijenjen u košarici.")}</p>
      ) : (
        <>
          <div className="pct">−{promo.percent} %</div>
          <p>
            {tx(lang, "Odprli smo novo trgovino: ", "Opening of our new store: ", "Otvorili smo novu trgovinu: ")}
            <b>−{promo.percent} %</b> {tx(lang, "s kodo", "with code", "s kodom")} <b>{promo.code}</b>
            {promo.min > 0 && <span className="small"> · {tx(lang, `nakup nad ${promo.min} €`, `orders over ${promo.min} €`, `kupnja iznad ${promo.min} €`)}</span>}
          </p>
          <button className="cta" onClick={take}>{tx(lang, "Uveljavi popust", "Apply discount", "Iskoristi popust")}</button>
        </>
      )}
    </div>
  );
}
