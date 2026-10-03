"use client";
import { useState } from "react";

export default function Newsletter({ lang }) {
  const en = lang === "en";
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
        <h4>{en ? "Get news first 🔥" : "Novi dizajni prvi v tvojem inboxu 🔥"}</h4>
        <p>{en ? "New designs, drops and subscriber-only deals. No spam." : "Novi dizajni, akcije in ugodnosti samo za naročnike. Brez spama."}</p>
      </div>
      <form className="nl-form" onSubmit={go}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={en ? "Your e-mail" : "Tvoj e-mail"} />
        <button disabled={busy}>{busy ? "…" : en ? "Sign up" : "Prijava"}</button>
      </form>
      {msg && <div className="nl-msg">{msg}</div>}
    </div>
  );
}
