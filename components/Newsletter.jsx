"use client";
import { useState } from "react";
import { tx } from "../lib/i18n";

export default function Newsletter({ lang }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, lang }) })
      .then((x) => x.json()).catch(() => ({}));
    setBusy(false);
    setMsg(r.message || "");
    if (r.ok) setEmail("");
  }
  return (
    <div className="nl-box">
      <div>
        <h4>{tx(lang, "Novi dizajni prvi v tvojem inboxu 🔥", "Get news first 🔥", "Novi dizajni prvi u tvom inboxu 🔥")}</h4>
        <p>{tx(lang, "Novi dizajni, akcije in ugodnosti samo za naročnike. Brez spama.", "New designs, drops and subscriber-only deals. No spam.", "Novi dizajni, akcije i pogodnosti samo za pretplatnike. Bez spama.")}</p>
      </div>
      <form className="nl-form" onSubmit={go}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tx(lang, "Tvoj e-mail", "Your e-mail", "Tvoj e-mail")} />
        <button disabled={busy}>{busy ? "…" : tx(lang, "Prijava", "Sign up", "Prijava")}</button>
      </form>
      {msg && <div className="nl-msg">{msg}</div>}
    </div>
  );
}
