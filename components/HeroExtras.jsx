"use client";
import { useEffect, useRef, useState } from "react";

/** Številka, ki se ob prikazu odšteje navzgor (npr. 0 → 227). */
export function CountUp({ to, prefix = "", suffix = "", ms = 1400 }) {
  const ref = useRef(null);
  const [n, setN] = useState(to);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setN(0);
    let raf, done = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done) return;
      done = true;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / ms);
        setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms]);
  return <b ref={ref}>{prefix}{n}{suffix}</b>;
}

/** Tekoč trak s prednostmi. */
export function Ticker({ items }) {
  const row = items.map((x, i) => <span key={i}>{x}<i>●</i></span>);
  return (
    <div className="ticker" aria-label={items.join(", ")}>
      <div className="ticker-in" aria-hidden="true">{row}{row}{row}{row}</div>
    </div>
  );
}
