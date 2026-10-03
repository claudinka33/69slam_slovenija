"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PIXEL_ID, GA_ID, getConsent, saveConsent, currentConsent, flushPending } from "../lib/track";

const TXT = {
  sl: {
    title: "Piškotki",
    body: "Nujne piškotke uporabljamo za delovanje košarice. Z tvojim dovoljenjem bi uporabili še analitične (Google Analytics) in oglaševalske (Meta Pixel), da vidimo, kaj deluje, in ti kažemo bolj relevantne oglase.",
    more: "Več o piškotkih",
    accept: "Sprejmi vse",
    reject: "Zavrni",
    settings: "Nastavitve",
    save: "Shrani izbiro",
    nec: "Nujni", necD: "Košarica, jezik in tvoja izbira glede piškotkov. Vedno vključeni.",
    ana: "Analitični", anaD: "Google Analytics — anonimna statistika obiska, da izboljšamo trgovino.",
    mkt: "Oglaševalski", mktD: "Meta Pixel (Facebook, Instagram) — merjenje oglasov in prikaz relevantnih oglasov.",
    link: "Nastavitve piškotkov",
  },
  hr: {
    title: "Kolačići",
    body: "Nužne kolačiće koristimo za rad košarice. Uz tvoje dopuštenje koristili bismo i analitičke (Google Analytics) i marketinške (Meta Pixel) kolačiće.",
    more: "Više o kolačićima",
    accept: "Prihvati sve",
    reject: "Odbij",
    settings: "Postavke",
    save: "Spremi odabir",
    nec: "Nužni", necD: "Košarica, jezik i tvoj odabir kolačića. Uvijek uključeni.",
    ana: "Analitički", anaD: "Google Analytics — anonimna statistika posjeta.",
    mkt: "Marketinški", mktD: "Meta Pixel (Facebook, Instagram) — mjerenje oglasa i relevantniji oglasi.",
    link: "Postavke kolačića",
  },
  en: {
    title: "Cookies",
    body: "We use essential cookies to run the cart. With your permission we'd also use analytics (Google Analytics) and advertising cookies (Meta Pixel) to see what works and show you more relevant ads.",
    more: "About cookies",
    accept: "Accept all",
    reject: "Reject",
    settings: "Settings",
    save: "Save choice",
    nec: "Essential", necD: "Cart, language and your cookie choice. Always on.",
    ana: "Analytics", anaD: "Google Analytics — anonymous visit statistics to improve the store.",
    mkt: "Advertising", mktD: "Meta Pixel (Facebook, Instagram) — ad measurement and more relevant ads.",
    link: "Cookie settings",
  },
};

/* ---------- nalaganje skript (samo po privolitvi) ---------- */
function loadMeta() {
  if (window.fbq) return;
  const n = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  });
  if (!window._fbq) window._fbq = n;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", PIXEL_ID);
}

function loadGa() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied",
  });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
}

function apply(c) {
  if (c.marketing) {
    loadMeta();
    window.fbq("consent", "grant");
  } else if (window.fbq) {
    window.fbq("consent", "revoke");
  }
  if (c.analytics) loadGa();
  if (window.gtag) {
    const g = c.analytics ? "granted" : "denied";
    const m = c.marketing ? "granted" : "denied";
    window.gtag("consent", "update", {
      analytics_storage: g, ad_storage: m, ad_user_data: m, ad_personalization: m,
    });
  }
  if (!c.analytics || !c.marketing) {
    // odstrani piškotke orodij, za katera ni (več) privolitve
    const kill = (re) => document.cookie.split("; ").forEach((x) => {
      const name = x.split("=")[0];
      if (re.test(name))
        for (const d of ["", location.hostname, "." + location.hostname.replace(/^www\./, "")])
          document.cookie = `${name}=; Max-Age=0; path=/${d ? "; domain=" + d : ""}`;
    });
    if (!c.analytics) kill(/^_ga/);
    if (!c.marketing) kill(/^_fb[pc]$/);
  }
}

function pageView(c) {
  if (c.marketing && window.fbq) window.fbq("track", "PageView");
  if (c.analytics && window.gtag)
    window.gtag("event", "page_view", { page_location: location.href, page_title: document.title });
}

/* ---------- pasica + nastavitve ---------- */
export default function Consent({ lang = "sl" }) {
  const t = TXT[lang] || TXT.sl;
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // pasica
  const [prefs, setPrefs] = useState(false); // podrobne nastavitve
  const [ana, setAna] = useState(false);
  const [mkt, setMkt] = useState(false);
  const firstView = useRef(true);

  useEffect(() => {
    try {
      const id = new URLSearchParams(location.search).get("fbclid");
      if (id) sessionStorage.setItem("fbclid69", id);
    } catch {}
    const c = getConsent();
    if (c) {
      window.__consent69 = c;
      setAna(c.analytics); setMkt(c.marketing);
      apply(c);
      pageView(c);
      flushPending();
    } else {
      setOpen(true);
    }
    const reopen = () => {
      const cur = currentConsent();
      setAna(!!cur?.analytics); setMkt(!!cur?.marketing);
      setPrefs(true); setOpen(true);
    };
    window.addEventListener("consent69-open", reopen);
    return () => window.removeEventListener("consent69-open", reopen);
  }, []);

  // ogled strani ob vsaki menjavi strani (prvi ogled se pošlje ob nalaganju)
  useEffect(() => {
    if (firstView.current) { firstView.current = false; return; }
    const c = currentConsent();
    if (c) pageView(c);
  }, [pathname]);

  function decide(analytics, marketing) {
    const before = currentConsent();
    const c = saveConsent({ analytics, marketing });
    apply(c);
    if (!before) pageView(c); // prvi ogled strani, ki je čakal na odločitev
    flushPending();
    setOpen(false); setPrefs(false);
  }

  if (!open) return null;
  return (
    <div className="ck69" role="dialog" aria-live="polite" aria-label={t.title}>
      <div className="ck69-card">
        <div className="ck69-head">
          <b>🍪 {t.title}</b>
        </div>
        <p className="ck69-body">
          {t.body} <a href={`/${lang}/info/piskotki`}>{t.more}</a>
        </p>
        {prefs && (
          <div className="ck69-prefs">
            <label className="ck69-row">
              <span><b>{t.nec}</b><small>{t.necD}</small></span>
              <input type="checkbox" checked disabled />
            </label>
            <label className="ck69-row">
              <span><b>{t.ana}</b><small>{t.anaD}</small></span>
              <input type="checkbox" checked={ana} onChange={(e) => setAna(e.target.checked)} />
            </label>
            <label className="ck69-row">
              <span><b>{t.mkt}</b><small>{t.mktD}</small></span>
              <input type="checkbox" checked={mkt} onChange={(e) => setMkt(e.target.checked)} />
            </label>
          </div>
        )}
        <div className="ck69-btns">
          {prefs ? (
            <button className="ck69-b ck69-ghost" onClick={() => decide(ana, mkt)}>{t.save}</button>
          ) : (
            <button className="ck69-b ck69-ghost" onClick={() => setPrefs(true)}>{t.settings}</button>
          )}
          <button className="ck69-b ck69-ghost" onClick={() => decide(false, false)}>{t.reject}</button>
          <button className="ck69-b ck69-main" onClick={() => decide(true, true)}>{t.accept}</button>
        </div>
      </div>
    </div>
  );
}

/** Povezava v nogi: ponovno odpre nastavitve piškotkov. */
export function ConsentLink({ lang = "sl" }) {
  const t = TXT[lang] || TXT.sl;
  return (
    <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("consent69-open")); }}>
      {t.link}
    </a>
  );
}
