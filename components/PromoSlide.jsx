"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePromo } from "./usePromo";

const SEEN = "promo69_seen";

/** Majhen drsnik v kotu po 15 s — enkrat na obiskovalca, dokler koda velja. */
export default function PromoSlide({ lang }) {
  const { promo, applied, apply } = usePromo();
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const path = usePathname() || "";
  const en = lang === "en";

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
    <div className="promoslide" role="dialog" aria-label="Popust">
      <button className="x" onClick={close} aria-label="Zapri">✕</button>
      {done ? (
        <p className="ok">✓ {en ? "Discount saved — it will be applied in your cart." : "Popust je shranjen — upoštevan bo v košarici."}</p>
      ) : (
        <>
          <div className="pct">−{promo.percent} %</div>
          <p>
            {en ? "Opening of our new store: " : "Odprli smo novo trgovino: "}
            <b>−{promo.percent} %</b> {en ? "with code" : "s kodo"} <b>{promo.code}</b>
            {promo.min > 0 && <span className="small"> · {en ? `orders over ${promo.min} €` : `nakup nad ${promo.min} €`}</span>}
          </p>
          <button className="cta" onClick={take}>{en ? "Apply discount" : "Uveljavi popust"}</button>
        </>
      )}
    </div>
  );
}
