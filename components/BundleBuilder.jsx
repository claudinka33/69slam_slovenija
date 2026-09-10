"use client";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { fmt } from "../lib/i18n";

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export default function BundleBuilder({ t }) {
  const {
    products, byId, bundleOpen, setBundleOpen, bundlePrefill, addBundle,
    usedInCart, showToast, BUNDLE_N, BUNDLE_OFF,
  } = useCart();

  const regular = products.filter((p) => !p.sale);
  const [sel, setSel] = useState([]);
  const [cur, setCur] = useState(regular[0]?.code);

  useEffect(() => {
    if (bundleOpen) {
      const pre = bundlePrefill || [];
      setSel(pre);
      setCur(pre.length ? pre[pre.length - 1].id : regular[0]?.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundleOpen]);

  if (!bundleOpen) return null;
  const p = byId(cur) || regular[0];

  // pri preverjanju zaloge NE štej kosov iz košarice, ki so že preneseni v sel
  const fromCartCnt = (id, size) => sel.filter((x) => x.id === id && x.size === size && x.fromCart).length;
  const free = (size) => {
    const st = p.stock[size] || 0;
    const selCnt = sel.filter((x) => x.id === p.code && x.size === size).length;
    const cartCnt = Math.max(0, usedInCart(p.code, size) - fromCartCnt(p.code, size));
    return st - selCnt - cartCnt;
  };

  function pick(size) {
    if (sel.length >= BUNDLE_N) return;
    if (free(size) <= 0) { showToast(t.out); return; }
    setSel([...sel, { id: p.code, size }]);
  }

  const full = sel.length === BUNDLE_N;
  const sum = sel.reduce((a, x) => a + (byId(x.id)?.price || 0), 0);
  const disc = +(sum * (1 - BUNDLE_OFF)).toFixed(2);

  return (
    <div className="modal open" role="dialog">
      <div className="overlay open" style={{ zIndex: -1 }} onClick={() => setBundleOpen(false)} />
      <div className="bcard">
        <div className="bhead">
          <h3>{t.bundle_title}</h3>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div className="bprog">
              {Array.from({ length: BUNDLE_N }, (_, i) => (
                <div key={i} className={`bdot ${i < sel.length ? "done" : ""}`}>{i < sel.length ? "✔" : i + 1}</div>
              ))}
            </div>
            <button className="x" onClick={() => setBundleOpen(false)}>✕</button>
          </div>
        </div>
        <div className="bbody">
          <div className="bsel">
            {Array.from({ length: BUNDLE_N }, (_, i) => {
              const s = sel[i];
              if (!s) return <div className="bslot" key={i}>{t.bundle_slot} {i + 1}</div>;
              const sp = byId(s.id);
              return (
                <div className="bslot filled" key={i}>
                  <div className="bimg" style={{ backgroundImage: `url('${sp?.img}')` }} />
                  <span>{sp?.name}<br />{s.size}</span>
                  <button className="brm" onClick={() => setSel(sel.filter((_, j) => j !== i))}>✕</button>
                </div>
              );
            })}
          </div>
          <div className="plabel">{t.print_label}</div>
          <div className="bgrid">
            {regular.map((x) => (
              <div key={x.code} className={`bpick ${x.code === p.code ? "active" : ""}`} onClick={() => setCur(x.code)}>
                <div className="bpimg" style={{ backgroundImage: `url('${x.img}')` }} />
                <div className="bpname">{x.name}</div>
              </div>
            ))}
          </div>
          <div className="plabel">{t.size_label}</div>
          <div className="sizes">
            {SIZE_ORDER.map((s) => {
              const has = s in p.stock;
              const f = has ? free(s) : 0;
              if (!has || f <= 0) return <div className="size out" key={s}>{s}</div>;
              return <div className="size" key={s} onClick={() => pick(s)}>{s}</div>;
            })}
          </div>
          <div className="stock">{p.name}</div>
        </div>
        <div className="bfoot">
          {full ? (
            <>
              <div className="trow"><span>{t.subtotal}</span><b style={{ textDecoration: "line-through" }}>{fmt(sum)}</b></div>
              <div className="trow total"><span>{t.bundle_total} (−15 %)</span><span style={{ color: "var(--red)" }}>{fmt(disc)}</span></div>
              <button className="checkout-btn" onClick={() => { addBundle(sel); showToast(t.bundle_added); }}>
                {t.bundle_add}
              </button>
            </>
          ) : (
            <>
              <div className="trow"><span>{t.bundle_pick}</span><b>{sel.length}/{BUNDLE_N}</b></div>
              <button className="checkout-btn" disabled>{t.bundle_add}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
