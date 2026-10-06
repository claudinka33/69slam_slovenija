"use client";
import { useState } from "react";
import { tx } from "../lib/i18n";

/** Galerija na strani izdelka: klik na sličico zamenja veliko sliko, puščici za listanje. */
export default function ProductGallery({ images, alt, name, lang }) {
  const list = images?.length ? images : [];
  const [i, setI] = useState(0);
  if (!list.length) return <div className="pmain" />;
  const go = (d) => setI((x) => (x + d + list.length) % list.length);
  return (
    <div>
      <div className="pmain pgal-main">
        <img src={list[i].src} alt={alt} />
        {list.length > 1 && (
          <>
            <button type="button" className="pgal-nav prev" aria-label={tx(lang, "Prejšnja slika", "Previous image", "Prethodna slika")} onClick={() => go(-1)}>‹</button>
            <button type="button" className="pgal-nav next" aria-label={tx(lang, "Naslednja slika", "Next image", "Sljedeća slika")} onClick={() => go(1)}>›</button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="pthumbs">
          {list.map((im, k) => (
            <img key={k} src={im.src} alt={`${name} ${k + 1}`} loading="lazy"
              className={k === i ? "on" : ""} onClick={() => setI(k)} />
          ))}
        </div>
      )}
    </div>
  );
}
