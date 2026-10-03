"use client";
import { useEffect, useState } from "react";

export default function RestoreCart({ lang, token }) {
  const [msg, setMsg] = useState(lang === "en" ? "Loading your cart…" : "Nalagam tvojo košarico …");
  useEffect(() => {
    fetch(`/api/cart-save?c=${encodeURIComponent(token || "")}`).then((r) => r.json()).then((d) => {
      if (d.ok && Array.isArray(d.cart) && d.cart.length) {
        try { localStorage.setItem("cart69", JSON.stringify(d.cart)); localStorage.setItem("cart69t", token); } catch {}
        window.location.replace(`/${lang}/blagajna`);
      } else setMsg(lang === "en" ? "This cart is no longer available." : "Ta košarica ni več na voljo.");
    }).catch(() => setMsg(lang === "en" ? "Something went wrong." : "Nekaj je šlo narobe."));
  }, []); // eslint-disable-line
  return <p style={{ fontSize: "1.1rem" }}>{msg} {!/Nalagam|Loading/.test(msg) && <a href={`/${lang}`} style={{ textDecoration: "underline" }}>{lang === "en" ? "Back to shop" : "Nazaj v trgovino"}</a>}</p>;
}
