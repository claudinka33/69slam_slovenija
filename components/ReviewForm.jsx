"use client";
import { useState } from "react";
import { tx } from "../lib/i18n";

export default function ReviewForm({ lang, o, t, name, items }) {
  const [nm, setNm] = useState(name || "");
  const [rv, setRv] = useState(() => Object.fromEntries(items.map((p) => [p.code, { rating: 0, title: "", body: "" }])));
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const upd = (code, k, v) => setRv((x) => ({ ...x, [code]: { ...x[code], [k]: v } }));

  async function submit(e) {
    e.preventDefault();
    const reviews = Object.entries(rv).filter(([, r]) => r.rating > 0).map(([code, r]) => ({ code, ...r }));
    if (!reviews.length) { setMsg(tx(lang, "Klikni zvezdice in oceni vsaj en artikel.", "Tap the stars to rate at least one item.", "Klikni zvjezdice i ocijeni barem jedan artikl.")); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ o, t, name: nm, reviews }) })
      .then((x) => x.json()).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok) setDone(r); else setMsg(r.message || (tx(lang, "Nekaj je šlo narobe.", "Something went wrong.", "Nešto je pošlo po zlu.")));
  }

  if (done) return (
    <div className="ckcard" style={{ textAlign: "center", padding: 36 }}>
      <div style={{ fontSize: "3rem" }}>💚</div>
      <h3 style={{ margin: "8px 0" }}>{tx(lang, "Hvala za tvojo oceno!", "Thank you for your review!", "Hvala na tvojoj recenziji!")}</h3>
      <p style={{ color: "var(--gray)" }}>{tx(lang, "Na strani bo objavljena po hitrem pregledu.", "It will appear on the site after a quick check.", "Bit će objavljena na stranici nakon kratke provjere.")}</p>
      {done.code && <div className="rv-code">{tx(lang, "Tvoja koda za naslednji nakup", "Your code for the next order", "Tvoj kod za sljedeću kupnju")}: <b>{done.code}</b><small>−{done.percent} % · {tx(lang, "velja 60 dni, za en nakup", "valid 60 days, one use", "vrijedi 60 dana, za jednu kupnju")}</small></div>}
      <a href={`/${lang}`} className="checkout-btn" style={{ display: "inline-block", maxWidth: 300, marginTop: 18, textDecoration: "none" }}>{tx(lang, "Nazaj v trgovino", "Back to shop", "Natrag u trgovinu")}</a>
    </div>
  );

  return (
    <form onSubmit={submit} className="rv-form">
      {items.map((p) => (
        <div className="ckcard rv-item" key={p.code}>
          <div className="rv-top">
            {p.img && <img src={p.img} alt="" />}
            <div><b>{p.name}</b><small>{p.type}</small>
              <div className="rv-stars" role="radiogroup">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} aria-label={`${n}`} className={n <= rv[p.code].rating ? "on" : ""} onClick={() => upd(p.code, "rating", n)}>★</button>
                ))}
              </div>
            </div>
          </div>
          {rv[p.code].rating > 0 && <>
            <input placeholder={tx(lang, "Naslov (neobvezno)", "Title (optional)", "Naslov (neobavezno)")} value={rv[p.code].title} maxLength={120} onChange={(e) => upd(p.code, "title", e.target.value)} />
            <textarea rows={3} placeholder={tx(lang, "Kaj ti je všeč? Kroj, udobje, kakovost …", "What do you like? Fit, comfort, quality …", "Što ti se sviđa? Kroj, udobnost, kvaliteta …")} value={rv[p.code].body} maxLength={2000} onChange={(e) => upd(p.code, "body", e.target.value)} />
          </>}
        </div>
      ))}
      <div className="ckcard">
        <label>{tx(lang, "Ime, ki bo prikazano ob oceni", "Name shown with the review", "Ime koje će biti prikazano uz recenziju")}</label>
        <input value={nm} onChange={(e) => setNm(e.target.value)} maxLength={60} placeholder={tx(lang, "npr. Marko S.", "e.g. Mark S.", "npr. Marko S.")} />
        <button className="checkout-btn" style={{ marginTop: 14 }} disabled={busy}>{busy ? "…" : tx(lang, "Oddaj oceno", "Submit review", "Pošalji recenziju")}</button>
        {msg && <div className="stubnote">{msg}</div>}
      </div>
    </form>
  );
}
