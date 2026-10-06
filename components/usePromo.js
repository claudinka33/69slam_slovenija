"use client";
import { useEffect, useState } from "react";

const KEY = "promo69";
let _p = null;
const load = () => (_p ||= fetch("/api/promo").then((r) => r.json()).catch(() => ({ ok: false })));

export const storedPromo = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };

/** Oglaševana koda: { promo, applied, apply() } */
export function usePromo() {
  const [promo, setPromo] = useState(null);
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    load().then((d) => { if (d?.ok) { setPromo(d); setApplied(storedPromo() === d.code); } });
    const on = () => setApplied(!!storedPromo());
    window.addEventListener("promo69", on);
    return () => window.removeEventListener("promo69", on);
  }, []);
  const apply = () => {
    if (!promo) return;
    try { localStorage.setItem(KEY, promo.code); } catch {}
    setApplied(true);
    window.dispatchEvent(new Event("promo69"));
  };
  return { promo, applied, apply };
}

/** Koliko bi koda prihranila na košarici (boljši popust velja: paket/akcija ali koda). */
export function promoSaving(cart, byId, percent) {
  const f = 1 - percent / 100;
  let s = 0;
  for (const c of cart) {
    if (c.bundle) continue; // paket 3 že ima −15 %
    const p = byId(c.id);
    if (!p) continue;
    const withCode = Math.round(p.price * f * 100) / 100;
    if (withCode < p.effPrice) s += (p.effPrice - withCode) * c.qty;
  }
  return +s.toFixed(2);
}
