"use client";
import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const out = await res.json();
    if (out.ok) window.location.href = "/admin";
    else setMsg(out.message || "Napaka pri prijavi.");
  }

  return (
    <main style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
      <form onSubmit={submit} className="ckcard ckform" style={{ width: 360 }}>
        <h3 style={{ fontStyle: "italic" }}>69SLAM · ADMIN</h3>
        <label>Geslo</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        <button className="checkout-btn" style={{ marginTop: 14 }}>Prijava</button>
        {msg && <div className="stubnote">{msg}</div>}
      </form>
    </main>
  );
}
