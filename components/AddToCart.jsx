"use client";
import { useState } from "react";
import { useCart } from "./CartContext";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function AddToCart({ code, t }) {
  const { byId, addItem, usedInCart, showToast } = useCart();
  const [size, setSize] = useState(null);
  const p = byId(code);
  if (!p) return null;

  const st = size ? p.stock[size] || 0 : 0;

  return (
    <div>
      <div className="plabel">{t.size_label}</div>
      <div className="sizes">
        {SIZE_ORDER.map((s) => {
          const has = s in p.stock;
          const avail = has ? (p.stock[s] || 0) - usedInCart(p.code, s) : 0;
          if (!has || (p.stock[s] || 0) === 0)
            return <div className="size out" key={s}>{s}</div>;
          return (
            <div key={s}
              className={`size ${size === s ? "active" : ""} ${avail <= 0 ? "out" : ""}`}
              onClick={() => avail > 0 && setSize(s)}>
              {s}
            </div>
          );
        })}
      </div>
      <div className={`stock ${size && st <= 3 ? "low" : ""}`}>
        {size ? (st <= 3 ? `⚠️ ${st} ${t.left}` : `✔ ${t.in_stock} (${st})`) : " "}
      </div>
      <button
        className="checkout-btn"
        onClick={() => {
          if (!size) { showToast(t.choose_size); return; }
          if (addItem(code, size)) showToast(t.added);
        }}
      >
        {t.add}
      </button>
    </div>
  );
}
