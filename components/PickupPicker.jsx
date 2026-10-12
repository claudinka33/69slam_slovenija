"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { tx } from "../lib/i18n";

/**
 * Izbira načina dostave (samo Slovenija): na dom, paketomat, pošta, bencinski servis.
 * Seznam prevzemnih mest Pošte Slovenije — iskanje po kraju / poštni številki / naslovu in »najbližji meni«.
 * value = null (na dom) ali izbrano mesto { k, v, id, n, a, z, c, lat, lng, h }.
 */
const MODES = [
  ["dom", "🏠"],
  ["paketomat", "📦"],
  ["posta", "🏤"],
  ["bs", "⛽"],
];
const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
function km(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const DAYS = ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"];
function todayHours(h) {
  if (!h) return "";
  const d = DAYS[new Date().getDay()];
  const part = h.split(";").map((x) => x.trim()).find((x) => x.startsWith(d + ":"));
  if (!part) return "";
  const v = part.slice(d.length + 1).replace(/^Odprto\s*/i, "").trim();
  if (!v) return "zaprto";
  if (/00:00\s*-\s*00:00/.test(v)) return "24/7";
  return v.replace(/\s+/g, "");
}

let pointsPromise = null;
function loadPoints() {
  if (!pointsPromise)
    pointsPromise = fetch("/api/posta/points").then((r) => r.json()).then((d) => d?.points || [])
      .catch(() => { pointsPromise = null; return []; });
  return pointsPromise;
}

export default function PickupPicker({ lang, value, onChange, mode, setMode }) {
  const t = (sl, en, hr) => tx(lang, sl, en, hr);
  const [points, setPoints] = useState(null);
  const [q, setQ] = useState("");
  const [me, setMe] = useState(null); // { lat, lng }
  const [geoMsg, setGeoMsg] = useState("");
  const [more, setMore] = useState(8);
  const touched = useRef(false);

  const LABEL = {
    dom: [t("Na dom", "Home delivery", "Na adresu"), t("poštar prinese na tvoj naslov", "to your address", "poštar donosi na tvoju adresu")],
    paketomat: [t("Paketomat", "Parcel locker", "Paketomat"), t("prevzem 24/7, brez čakanja", "pick up 24/7", "preuzimanje 0–24")],
    posta: [t("Na pošti", "Post office", "Na pošti"), t("prevzem v poslovalnici", "pick up at the counter", "preuzimanje u poslovnici")],
    bs: [t("Bencinski servis", "Petrol station", "Benzinska postaja"), t("Petrol / MOL", "Petrol / MOL", "Petrol / MOL")],
  };

  // ob izbiri prevzemnega načina naloži seznam in predizpolni iskanje s poštno številko / krajem iz obrazca
  useEffect(() => {
    if (mode === "dom") return;
    loadPoints().then(setPoints);
    if (!touched.current && !q) {
      const f = document.getElementById("ckform");
      const zip = f?.querySelector("[name=zip]")?.value?.trim();
      const city = f?.querySelector("[name=city]")?.value?.trim();
      if (zip || city) setQ(zip || city);
    }
    setMore(8);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    if (!points || mode === "dom") return [];
    let l = points.filter((p) => p.k === mode);
    const s = fold(q.trim());
    if (s) {
      const words = s.split(/\s+/).filter(Boolean);
      l = l.filter((p) => {
        const hay = fold(`${p.n} ${p.a} ${p.z} ${p.c}`);
        return words.every((w) => hay.includes(w));
      });
      // poštna številka: najprej točno ujemanje
      if (/^\d{4}$/.test(s)) l.sort((a, b) => (b.z === s) - (a.z === s));
    }
    if (me) {
      l = l.filter((p) => p.lat && p.lng).map((p) => ({ ...p, d: km(me, p) }));
      l.sort((a, b) => a.d - b.d);
    }
    return l;
  }, [points, mode, q, me]);

  function near() {
    setGeoMsg("");
    if (!navigator.geolocation) { setGeoMsg(t("Lokacija ni na voljo — vpiši kraj.", "Location unavailable — type your town.", "Lokacija nije dostupna — upiši mjesto.")); return; }
    setGeoMsg(t("Iščem tvojo lokacijo …", "Finding your location …", "Tražim tvoju lokaciju …"));
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setQ(""); touched.current = true; setGeoMsg(""); setMore(8); },
      () => setGeoMsg(t("Lokacije ni bilo mogoče dobiti — vpiši kraj ali poštno številko.", "Couldn't get your location — type your town or postcode.", "Lokaciju nije moguće dobiti — upiši mjesto ili poštanski broj.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }

  function pickMode(m) {
    setMode(m);
    if (m === "dom" || (value && value.k !== m)) onChange(null);
  }

  return (
    <div className="pk">
      <div className="pk-modes" role="radiogroup">
        {MODES.map(([m, ico]) => (
          <button type="button" key={m} role="radio" aria-checked={mode === m} className={`pk-mode${mode === m ? " on" : ""}`} onClick={() => pickMode(m)}>
            <span className="pk-ico">{ico}</span>
            <b>{LABEL[m][0]}</b>
            <small>{LABEL[m][1]}</small>
          </button>
        ))}
      </div>

      {mode !== "dom" && (
        <div className="pk-box">
          {value ? (
            <div className="pk-chosen">
              <div>
                <div className="pk-ok">✓ {t("Izbrano prevzemno mesto", "Selected pick-up point", "Odabrano mjesto preuzimanja")}</div>
                <b>{value.n}</b>
                <div>{value.a}, {value.z} {value.c}</div>
                {todayHours(value.h) && <div className="pk-h">🕒 {t("danes", "today", "danas")} {todayHours(value.h)}</div>}
              </div>
              <button type="button" className="pk-change" onClick={() => onChange(null)}>{t("Spremeni", "Change", "Promijeni")}</button>
            </div>
          ) : (
            <>
              <div className="pk-search">
                <input type="search" value={q} placeholder={t("Vpiši kraj, poštno številko ali ulico", "Town, postcode or street", "Upiši mjesto, poštanski broj ili ulicu")}
                  onChange={(e) => { setQ(e.target.value); touched.current = true; setMe(null); setMore(8); }}
                  onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} />
                <button type="button" onClick={near}>📍 {t("Najbližji meni", "Near me", "Najbliže meni")}</button>
              </div>
              {geoMsg && <div className="pk-note">{geoMsg}</div>}
              {points === null ? <div className="pk-note">{t("Nalagam prevzemna mesta …", "Loading pick-up points …", "Učitavam mjesta preuzimanja …")}</div>
                : !points.length ? <div className="pk-note">{t("Seznama trenutno ni mogoče naložiti. Izberi dostavo na dom ali poskusi čez minuto.", "The list can't be loaded right now. Choose home delivery or try again in a minute.", "Popis trenutno nije moguće učitati. Odaberi dostavu na adresu ili pokušaj za minutu.")}</div>
                : !list.length ? <div className="pk-note">{t("Ni zadetkov — poskusi z drugim krajem ali poštno številko.", "No results — try another town or postcode.", "Nema rezultata — pokušaj s drugim mjestom ili poštanskim brojem.")}</div>
                : (
                  <>
                    {!q && !me && <div className="pk-note">{t("Vpiši kraj ali klikni »Najbližji meni«.", "Type your town or tap “Near me”.", "Upiši mjesto ili klikni »Najbliže meni«.")}</div>}
                    {(q || me) && (
                      <ul className="pk-list">
                        {list.slice(0, more).map((p) => (
                          <li key={p.v + p.id}>
                            <button type="button" onClick={() => onChange(p)}>
                              <span className="pk-main">
                                <b>{p.n}</b>
                                <span>{p.a}, {p.z} {p.c}</span>
                                <span className="pk-meta">
                                  {p.d != null && <em>{p.d < 1 ? `${Math.round(p.d * 1000)} m` : `${p.d.toFixed(1).replace(".", ",")} km`}</em>}
                                  {todayHours(p.h) && <em>🕒 {t("danes", "today", "danas")} {todayHours(p.h)}</em>}
                                  {(p.v === 444 || p.v === 445) && <em>Direct4me</em>}
                                </span>
                              </span>
                              <span className="pk-pick">{t("Izberi", "Select", "Odaberi")}</span>
                            </button>
                            {p.lat && p.lng && <a className="pk-map" href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noopener">{t("Zemljevid", "Map", "Karta")} ↗</a>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(q || me) && list.length > more && (
                      <button type="button" className="pk-more" onClick={() => setMore((n) => n + 12)}>
                        {t(`Pokaži več (${list.length - more})`, `Show more (${list.length - more})`, `Prikaži više (${list.length - more})`)}
                      </button>
                    )}
                  </>
                )}
            </>
          )}
          <div className="pk-foot">{t("Ko paket prispe, te Pošta obvesti s SMS-om ali e-mailom. Tvoj naslov spodaj potrebujemo za račun.", "Pošta will notify you by SMS or e-mail when the parcel arrives. We need your address below for the invoice.", "Kad paket stigne, Pošta te obavještava SMS-om ili e-mailom. Tvoja adresa ispod potrebna je za račun.")}</div>
        </div>
      )}
    </div>
  );
}
