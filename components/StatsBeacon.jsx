"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { beacon } from "../lib/beacon";

/** Šteje oglede strani za lastno statistiko v adminu (brez piškotkov). */
export default function StatsBeacon() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!pathname) return;
    if (first.current) {
      first.current = false;
      beacon({ k: "view", p: pathname, r: document.referrer || "", q: window.location.search || "", first: true });
    } else {
      beacon({ k: "view", p: pathname });
    }
  }, [pathname]);
  return null;
}
