"use client";
import { useState } from "react";

export default function UnsubscribeBox({ lang, email, token }) {
  const en = lang === "en";
  const [state, setState] = useState("");
  async function go() {
    setState("…");
    const r = await fetch(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`, { method: "POST" }).then((x) => x.json()).catch(() => ({}));
    setState(r.ok ? "ok" : "err");
  }
  if (state === "ok") return <p style={{ fontSize: "1.1rem" }}>✅ {en ? "You have been unsubscribed. We're sorry to see you go!" : "Odjava je uspela. Žal nam je, da odhajaš!"}</p>;
  return (
    <div>
      <p style={{ fontSize: "1.05rem" }}>{en ? <>Stop receiving news and reminders to <b>{email}</b>?</> : <>Ne želiš več prejemati novic in opomnikov na <b>{email}</b>?</>}</p>
      <button className="checkout-btn" style={{ maxWidth: 320, marginTop: 14 }} onClick={go} disabled={state === "…"}>
        {state === "…" ? "…" : en ? "Unsubscribe" : "Potrdi odjavo"}
      </button>
      {state === "err" && <p style={{ color: "var(--red)", marginTop: 10 }}>{en ? "The link is not valid." : "Povezava ni veljavna."}</p>}
      <p style={{ color: "var(--gray)", fontSize: ".85rem", marginTop: 16 }}>{en ? "Order confirmations and shipping notices will still be sent." : "Potrditve naročil in obvestila o pošiljkah boš še vedno prejemal/-a."}</p>
    </div>
  );
}
