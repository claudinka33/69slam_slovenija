"use client";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartContext";
import { fmt } from "../lib/i18n";


export default function AddToCart({ code, t }) {
  const { byId, addItem, usedInCart, showToast } = useCart();
  const [size, setSize] = useState(null);
  const [stick, setStick] = useState(false);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  // telefon: ko glavni gumb zdrsne iz zaslona (navzgor), se spodaj pokaže lepljiv gumb
  useEffect(() => {
    const el = btnRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setStick(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const p = byId(code);
  if (!p) return null;

  const st = size ? p.stock[size] || 0 : 0;

  function add() {
    if (!size) {
      showToast(t.choose_size);
      boxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (addItem(code, size)) showToast(t.added);
  }

  return (
    <div ref={boxRef}>
      <div className="plabel">{t.size_label}</div>
      <div className="sizes">
        {p.sizes.map((s) => {
          const has = s in p.stock;
          const avail = has ? (p.stock[s] || 0) - usedInCart(p.code, s) : 0;
          if (!has || (p.stock[s] || 0) === 0)
            return null; // velikosti, ki jih ni na zalogi, ne prikazujemo
          return (
            <div key={s}
              className={`size ${size === s ? "active" : ""} ${avail <= 0 ? "out" : ""}`}
              onClick={() => avail > 0 && setSize(s)}>
              {s}
            </div>
          );
        })}
      </div>
      <div className={`stock ${size && st === 1 ? "low" : ""}`}>
        {size ? (st === 1 ? `⚠️ ${t.last1}` : `✔ ${t.in_stock}`) : " "}
      </div>
      <button ref={btnRef} className="checkout-btn" onClick={add}>
        {t.add}
      </button>
      <div className={`stickbar ${stick ? "on" : ""}`} aria-hidden={!stick}>
        <div className="sb-info">
          <b>{p.name}</b>
          <span>{fmt(p.effPrice ?? p.price)}{size ? ` · ${size}` : ""}</span>
        </div>
        <button className="sb-btn" onClick={add} tabIndex={stick ? 0 : -1}>
          {size ? t.add : t.size_label}
        </button>
      </div>
    </div>
  );
}
