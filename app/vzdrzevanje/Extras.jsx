"use client";
import { useEffect, useState } from "react";

export function Countdown({ until }) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const end = Date.parse(until);
    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) setTimeout(() => (window.location.href = "/sl"), 1500);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left === null) return <div className="mt-cd" />;
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  const p = (n) => String(n).padStart(2, "0");
  if (left === 0) return <div className="mt-cd"><b>Odpiramo! 🎉</b></div>;
  return (
    <div className="mt-cd">
      <div><b>{p(h)}</b><span>ur</span></div>
      <div><b>{p(m)}</b><span>min</span></div>
      <div><b>{p(s)}</b><span>sek</span></div>
    </div>
  );
}

export function TeamLogin() {
  const [open, setOpen] = useState(false);
  const [g, setG] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/predogled", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geslo: g }) });
      if (r.ok) { window.location.href = "/sl"; return; }
      setErr("Napačno geslo.");
    } catch { setErr("Poskusi znova."); }
    setBusy(false);
  }
  if (!open) return <button className="mt-team" onClick={() => setOpen(true)}>🔒 Vstop za ekipo</button>;
  return (
    <form className="mt-form mt-pass" onSubmit={go}>
      <input type="password" autoFocus placeholder="Geslo" value={g} onChange={(e) => setG(e.target.value)} aria-label="Geslo" />
      <button disabled={busy}>{busy ? "…" : "Vstopi"}</button>
      {err && <div className="mt-msg err" style={{ width: "100%" }}>{err}</div>}
    </form>
  );
}
