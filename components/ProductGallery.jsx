"use client";
import { useState } from "react";

/** Galerija na strani izdelka: klik na sličico zamenja veliko sliko, puščici za listanje. */
export default function ProductGallery({ images, alt, name }) {
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
            <button type="button" className="pgal-nav prev" aria-label="Prejšnja slika" onClick={() => go(-1)}>‹</button>
            <button type="button" className="pgal-nav next" aria-label="Naslednja slika" onClick={() => go(1)}>›</button>
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
