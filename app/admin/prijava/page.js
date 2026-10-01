"use client";
import { useState } from "react";
import "../admin.css";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoBad, setLogoBad] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (out.ok) window.location.href = "/admin";
    else setMsg(out.message || "Napaka pri prijavi.");
  }

  return (
    <div className="adm adm-login">
      <form onSubmit={submit}>
        <div className="lg">
          {logoBad ? <b style={{ color: "#fff", fontSize: 22, fontStyle: "italic" }}>69SLAM</b>
            : <img src="/logo.png" alt="69SLAM" ref={(el) => { if (el && el.complete && el.naturalWidth === 0) setLogoBad(true); }} onError={() => setLogoBad(true)} />}
          <small>ADMIN · CMS</small>
        </div>
        <div className="adm-field">
          <label>Geslo</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </div>
        <button className="adm-btn pri" style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }} disabled={busy}>
          {busy ? "Prijavljam …" : "Prijava"}
        </button>
        {msg && <div className="err">{msg}</div>}
      </form>
    </div>
  );
}
