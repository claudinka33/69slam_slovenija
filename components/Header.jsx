"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { LANGS } from "../lib/i18n";

export default function Header({ lang, t }) {
  const { count, setDrawerOpen } = useCart();
  const pathname = usePathname() || `/${lang}`;
  const rest = pathname.replace(/^\/(sl|hr|en)/, "") || "";
  const [logoFailed, setLogoFailed] = useState(false);
  const logoRef = useRef(null);

  useEffect(() => {
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) setLogoFailed(true);
  }, []);

  return (
    <header className="site">
      <div className="topbar">{t.topbar}</div>
      <div className="wrap hrow">
        <Link href={`/${lang}`} className="logo" aria-label="69SLAM Slovenija">
          {logoFailed ? (
            <>69<span>SLAM</span> <span className="tld">.SI</span></>
          ) : (
            <img
              ref={logoRef}
              src="/logo.png"
              alt="69SLAM"
              onError={() => setLogoFailed(true)}
              style={{ height: 26, width: "auto", display: "block" }}
            />
          )}
        </Link>
        <nav className="main">
          <Link href={`/${lang}#shop`}>{t.nav_shop}</Link>
          <Link href={`/${lang}#tech`}>{t.nav_why}</Link>
          <Link href={`/${lang}/zgodba`}>{t.nav_story}</Link>
          <Link href={`/${lang}#faq`}>{t.nav_ship}</Link>
        </nav>
        <div className="hspace" />
        <div className="langs">
          {LANGS.map((l) => (
            <Link key={l} href={`/${l}${rest}`} className={l === lang ? "active" : ""}>
              {l === "sl" ? "SI" : l.toUpperCase()}
            </Link>
          ))}
        </div>
        <button className="cartbtn" onClick={() => setDrawerOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
          <span className="count">{count}</span>
        </button>
      </div>
    </header>
  );
}
