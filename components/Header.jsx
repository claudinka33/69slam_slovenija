"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { LANGS } from "../lib/i18n";

export default function Header({ lang, t }) {
  const { count, setDrawerOpen } = useCart();
  const pathname = usePathname() || `/${lang}`;
  const rest = pathname.replace(/^\/(sl|hr|en)/, "") || "";

  return (
    <header className="site">
      <div className="topbar">{t.topbar}</div>
      <div className="wrap hrow">
        <Link href={`/${lang}`} className="logo">69<span>SLAM</span> <span className="tld">.SI</span></Link>
        <nav className="main">
          <Link href={`/${lang}#shop`}>{t.nav_shop}</Link>
          <Link href={`/${lang}#tech`}>{t.nav_why}</Link>
          <Link href={`/${lang}#story`}>{t.nav_story}</Link>
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
          🛒 <span className="count">{count}</span>
        </button>
      </div>
    </header>
  );
}
