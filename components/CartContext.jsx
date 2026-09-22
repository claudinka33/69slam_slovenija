"use client";
import { createContext, useContext, useEffect, useState } from "react";

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const BUNDLE_N = 3;
const BUNDLE_OFF = 0.15;
const FREE_FROM = 50;
const SHIP = 5;

export function CartProvider({ children, products: initialProducts }) {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState([]); // {id(code), size, qty} | {bundle:true, items:[{id,size}], qty:1}
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [bundlePrefill, setBundlePrefill] = useState(null);
  const [toast, setToastMsg] = useState("");

  // živa zaloga iz baze (če je na voljo) prepiše posnetek iz kataloga
  useEffect(() => {
    fetch("/api/stock")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok || !d.stock) return;
        setProducts((ps) =>
          ps.map((p) => {
            const live = d.stock[p.code];
            if (!live) return p;
            const stock = { ...p.stock };
            for (const s of Object.keys(stock)) if (s in live) stock[s] = live[s];
            const totalStock = Object.values(stock).reduce((a, b) => a + b, 0);
            return { ...p, stock, totalStock };
          })
        );
      })
      .catch(() => {});
  }, []);

  // localStorage — obstojnost košarice (varno ovito)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cart69") || "[]");
      if (Array.isArray(saved)) setCart(saved);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("cart69", JSON.stringify(cart)); } catch {}
  }, [cart]);

  const byId = (id) => products.find((p) => p.code === id);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2400);
  }

  /** koliko kosov (id,size) je že zasedenih v košarici (posamezni + paketi) */
  function usedInCart(id, size, extraSel = []) {
    const m = (x) => x.id === id && x.size === size;
    return (
      cart.filter((c) => !c.bundle && m(c)).reduce((a, c) => a + c.qty, 0) +
      cart.filter((c) => c.bundle).flatMap((c) => c.items).filter(m).length +
      extraSel.filter(m).length
    );
  }

  function addItem(id, size) {
    const p = byId(id);
    if (!p) return false;
    const st = p.stock[size] || 0;
    if (usedInCart(id, size) >= st) { showToast(`⚠️ ${st} max`); return false; }
    setCart((c) => {
      const i = c.findIndex((x) => !x.bundle && x.id === id && x.size === size);
      if (i > -1) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { id, size, qty: 1 }];
    });
    setDrawerOpen(true);
    return true;
  }

  function chQty(i, d) {
    setCart((c) => {
      const n = [...c];
      const item = n[i];
      if (!item) return c;
      if (item.bundle) { n.splice(i, 1); return n; }
      if (d > 0) {
        const p = byId(item.id);
        if (usedInCart(item.id, item.size) >= (p?.stock[item.size] || 0)) return c;
      }
      item.qty += d;
      if (item.qty <= 0) n.splice(i, 1);
      else n[i] = { ...item };
      return n;
    });
  }

  function addBundle(sel) {
    // kose, prenesene iz košarice, odstrani med posameznimi
    setCart((c) => {
      let n = [...c];
      for (const x of sel) {
        if (!x.fromCart) continue;
        const i = n.findIndex((y) => !y.bundle && y.id === x.id && y.size === x.size);
        if (i > -1) {
          n[i] = { ...n[i], qty: n[i].qty - 1 };
          if (n[i].qty <= 0) n.splice(i, 1);
        }
      }
      return [...n, { bundle: true, items: sel.map((x) => ({ id: x.id, size: x.size })), qty: 1 }];
    });
    setBundleOpen(false);
    setDrawerOpen(true);
  }

  function openBundle() {
    // prenesi obstoječe posamezne kose (redna ponudba) v paket
    const sel = [];
    for (const c of cart) {
      if (c.bundle) continue;
      const p = byId(c.id);
      if (!p || p.sale) continue;
      for (let k = 0; k < c.qty && sel.length < BUNDLE_N; k++)
        sel.push({ id: c.id, size: c.size, fromCart: true });
      if (sel.length >= BUNDLE_N) break;
    }
    setBundlePrefill(sel);
    setBundleOpen(true);
    setDrawerOpen(false);
  }

  function clearCart() {
    setCart([]);
    try { localStorage.removeItem("cart69"); } catch {}
  }

  // izračuni
  const count = cart.reduce((a, c) => a + (c.bundle ? BUNDLE_N : c.qty), 0);
  const bundlePrice = (items) =>
    +(items.reduce((s, x) => s + (byId(x.id)?.price || 0), 0) * (1 - BUNDLE_OFF)).toFixed(2);
  const subtotal = cart.reduce(
    (a, c) => a + (c.bundle ? bundlePrice(c.items) : (byId(c.id)?.effPrice || 0) * c.qty),
    0
  );
  const shipping = subtotal >= FREE_FROM || subtotal === 0 ? 0 : SHIP;
  const singles = cart.filter((c) => !c.bundle && !byId(c.id)?.sale).reduce((a, c) => a + c.qty, 0);

  return (
    <CartCtx.Provider
      value={{
        products, cart, byId, addItem, chQty, clearCart, count, subtotal, shipping,
        bundlePrice, singles, usedInCart,
        drawerOpen, setDrawerOpen,
        bundleOpen, setBundleOpen, openBundle, bundlePrefill, addBundle,
        toast, showToast,
        BUNDLE_N, BUNDLE_OFF,
      }}
    >
      {children}
      {toast ? <div className="toast show">{toast}</div> : null}
    </CartCtx.Provider>
  );
}
