"use client";
import { useState } from "react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  async function go(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, lang: "sl" }) });
      const j = await r.json();
      setMsg({ ok: j.ok, t: j.ok ? "Hvala! Obvestimo te takoj, ko odpremo. 🙌" : j.message });
      if (j.ok) setEmail("");
    } catch { setMsg({ ok: false, t: "Poskusi znova čez trenutek." }); }
    setBusy(false);
  }
  return (
    <>
      <form className="mt-form" onSubmit={go}>
        <input type="email" required placeholder="tvoj@email.si" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail" />
        <button disabled={busy}>{busy ? "…" : "Obvesti me"}</button>
      </form>
      <div className={`mt-msg${msg && !msg.ok ? " err" : ""}`}>{msg?.t || ""}</div>
    </>
  );
}
