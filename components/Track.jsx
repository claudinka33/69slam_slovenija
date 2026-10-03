"use client";
import { useEffect } from "react";
import { track } from "../lib/track";

/** Ogled izdelka (ViewContent / view_item). */
export function TrackView({ id, name, price }) {
  useEffect(() => {
    track("ViewContent", { value: price, items: [{ id, name, price, qty: 1 }] });
  }, [id]);
  return null;
}

/** Nakup (Purchase / purchase) — samo enkrat na naročilo, tudi če kupec osveži stran. */
export function TrackPurchase({ number, value, items }) {
  useEffect(() => {
    if (!number) return;
    const key = `p69-${number}`;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, "1"); } catch {}
    track("Purchase", { value, items, orderId: number }, `order-${number}`);
  }, [number]);
  return null;
}
