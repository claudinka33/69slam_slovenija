"use client";
import { useEffect, useState } from "react";
import { tx } from "../lib/i18n";

export default function RestoreCart({ lang, token }) {
  const [msg, setMsg] = useState(tx(lang, "Nalagam tvojo košarico …", "Loading your cart…", "Učitavam tvoju košaricu …"));
  useEffect(() => {
    fetch(`/api/cart-save?c=${encodeURIComponent(token || "")}`).then((r) => r.json()).then((d) => {
      if (d.ok && Array.isArray(d.cart) && d.cart.length) {
        try { localStorage.setItem("cart69", JSON.stringify(d.cart)); localStorage.setItem("cart69t", token); } catch {}
        window.location.replace(`/${lang}/blagajna`);
      } else setMsg(tx(lang, "Ta košarica ni več na voljo.", "This cart is no longer available.", "Ova košarica više nije dostupna."));
    }).catch(() => setMsg(tx(lang, "Nekaj je šlo narobe.", "Something went wrong.", "Nešto je pošlo po zlu.")));
  }, []); // eslint-disable-line
  return <p style={{ fontSize: "1.1rem" }}>{msg} {!/Nalagam|Loading|Učitavam/.test(msg) && <a href={`/${lang}`} style={{ textDecoration: "underline" }}>{tx(lang, "Nazaj v trgovino", "Back to shop", "Natrag u trgovinu")}</a>}</p>;
}
