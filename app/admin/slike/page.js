"use client";
import { useEffect, useState } from "react";

/** Prenos vseh slik s Shopifyja v Vercel Blob (enkratno, pred zaprtjem Shopifyja). */
export default function SlikePage() {
  const [st, setSt] = useState(null);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/admin/images-mirror").then((r) => r.json()).then(setSt).catch(() => setMsg("Napaka pri branju stanja."));
  useEffect(() => { load(); }, []);

  async function run() {
    setRunning(true); setMsg(""); setFailed([]);
    let stuck = 0;
    for (;;) {
      let j;
      try { j = await fetch("/api/admin/images-mirror", { method: "POST" }).then((r) => r.json()); }
      catch { setMsg("Povezava je prekinjena. Klikni znova, nadaljuje, kjer je ostalo."); break; }
      if (!j.ok) { setMsg(j.message || "Napaka."); break; }
      setSt(j);
      setFailed(j.failed || []);
      if (!j.remaining) { setMsg("Končano ✅ Vse slike so zdaj na Vercelu."); break; }
      stuck = j.copied ? 0 : stuck + 1;
      if (stuck >= 2) { setMsg(`Ostalo je ${j.remaining} slik, ki se jih ne da prenesti (spodaj).`); break; }
    }
    setRunning(false);
  }

  const pct = st?.total ? Math.round((st.done / st.total) * 100) : 0;
  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16, fontFamily: "Poppins, system-ui, sans-serif" }}>
      <a href="/admin" style={{ color: "#666", fontSize: 14 }}>← Nazaj v admin</a>
      <h1 style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Prenos slik s Shopifyja</h1>
      <p style={{ lineHeight: 1.6 }}>Vse slike izdelkov se skopirajo na Vercel. Potem trgovina ne potrebuje več Shopifyja. Pusti stran odprto, dokler ne piše »Končano«.</p>
      {st && (
        <>
          <div style={{ background: "#f5f5f7", borderRadius: 50, height: 18, overflow: "hidden", margin: "20px 0 8px" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#06d6a0", transition: "width .4s" }} />
          </div>
          <div style={{ fontWeight: 700 }}>{st.done} / {st.total} slik ({pct} %)</div>
        </>
      )}
      <button onClick={run} disabled={running || (st && !st.remaining)}
        style={{ marginTop: 20, padding: "14px 24px", borderRadius: 12, border: 0, background: running ? "#999" : "#0a0a0a", color: "#fff",
          fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", cursor: running ? "wait" : "pointer" }}>
        {running ? "Prenašam …" : st && !st.remaining ? "Vse preneseno" : "Začni prenos"}
      </button>
      {msg && <p style={{ marginTop: 16, fontWeight: 700 }}>{msg}</p>}
      {failed.length > 0 && (
        <details style={{ marginTop: 12 }}><summary>Neuspešne ({failed.length})</summary>
          <ul style={{ fontSize: 12, wordBreak: "break-all" }}>{failed.map((f) => <li key={f.src}>{f.src} — {f.error}</li>)}</ul>
        </details>
      )}
    </main>
  );
}
