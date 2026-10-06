"use client";
import { useState } from "react";
import { tx } from "../lib/i18n";

export default function UnsubscribeBox({ lang, email, token }) {
  const [state, setState] = useState("");
  async function go() {
    setState("…");
    const r = await fetch(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`, { method: "POST" }).then((x) => x.json()).catch(() => ({}));
    setState(r.ok ? "ok" : "err");
  }
  if (state === "ok") return <p style={{ fontSize: "1.1rem" }}>✅ {tx(lang, "Odjava je uspela. Žal nam je, da odhajaš!", "You have been unsubscribed. We're sorry to see you go!", "Odjava je uspjela. Žao nam je što odlaziš!")}</p>;
  return (
    <div>
      <p style={{ fontSize: "1.05rem" }}>{tx(lang, <>Ne želiš več prejemati novic in opomnikov na <b>{email}</b>?</>, <>Stop receiving news and reminders to <b>{email}</b>?</>, <>Ne želiš više primati novosti i podsjetnike na <b>{email}</b>?</>)}</p>
      <button className="checkout-btn" style={{ maxWidth: 320, marginTop: 14 }} onClick={go} disabled={state === "…"}>
        {state === "…" ? "…" : tx(lang, "Potrdi odjavo", "Unsubscribe", "Potvrdi odjavu")}
      </button>
      {state === "err" && <p style={{ color: "var(--red)", marginTop: 10 }}>{tx(lang, "Povezava ni veljavna.", "The link is not valid.", "Poveznica nije valjana.")}</p>}
      <p style={{ color: "var(--gray)", fontSize: ".85rem", marginTop: 16 }}>{tx(lang, "Potrditve naročil in obvestila o pošiljkah boš še vedno prejemal/-a.", "Order confirmations and shipping notices will still be sent.", "Potvrde narudžbi i obavijesti o pošiljkama i dalje ćeš primati.")}</p>
    </div>
  );
}
