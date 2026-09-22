"use client";
import { useEffect, useState } from "react";

const fmtC = (c) => (c / 100).toFixed(2).replace(".", ",") + " €";
const PAY = { card: "Kartica", proforma: "Predračun", cod: "Po povzetju" };
const STATUSES = ["novo", "placano", "poslano", "zakljuceno", "preklicano"];
const SLABEL = { novo: "Novo", placano: "Plačano", poslano: "Poslano", zakljuceno: "Zaključeno", preklicano: "Preklicano" };
const SCOLOR = { novo: "#1E8FFF", placano: "#0B9E6E", poslano: "#B07D2B", zakljuceno: "#5A6B82", preklicano: "#E23D3D" };

export default function Admin() {
  const [tab, setTab] = useState("narocila");
  const [orders, setOrders] = useState(null);
  const [stock, setStock] = useState(null);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null); // odprto naročilo

  async function loadOrders() {
    const d = await fetch("/api/admin/orders").then((r) => r.json()).catch(() => null);
    if (d?.nodb) setMsg("⚠️ Baza še ni povezana. V Vercelu: Storage → Create Database → Neon (Postgres), poveži s projektom in redeployaj. Potem tukaj klikni 'Uvozi katalog'.");
    setOrders(d?.orders || []);
  }
  async function loadStock() {
    const d = await fetch("/api/admin/stock").then((r) => r.json()).catch(() => null);
    setStock(d?.rows || []);
  }
  useEffect(() => { loadOrders(); loadStock(); }, []);

  async function seed() {
    setMsg("Uvažam katalog ...");
    const d = await fetch("/api/admin/seed", { method: "POST" }).then((r) => r.json());
    setMsg(d.message || "");
    loadStock(); loadOrders();
  }
  async function setStatus(id, status) {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    loadOrders(); loadStock();
  }
  async function adjust(sku, delta) {
    const d = await fetch("/api/admin/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, delta }) }).then((r) => r.json());
    if (!d.ok) setMsg(d.message || "Napaka.");
    loadStock();
  }
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/prijava";
  }

  const lowStock = (stock || []).filter((r) => r.stock > 0 && r.stock <= 2).length;
  const newOrders = (orders || []).filter((o) => o.status === "novo").length;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>69SLAM · Admin</h2>
        <div style={{ flex: 1 }} />
        <button className="chip" onClick={seed}>⬇ Uvozi katalog v bazo</button>
        <button className="chip" onClick={logout}>Odjava</button>
      </div>

      <div style={{ display: "flex", gap: 12, margin: "18px 0" }}>
        <button className={`chip ${tab === "narocila" ? "active" : ""}`} onClick={() => setTab("narocila")}>
          Naročila{newOrders ? ` (${newOrders} novih)` : ""}
        </button>
        <button className={`chip ${tab === "zaloga" ? "active" : ""}`} onClick={() => setTab("zaloga")}>
          Zaloga{lowStock ? ` (${lowStock} pri koncu)` : ""}
        </button>
      </div>

      {msg && <div className="stubnote" style={{ marginBottom: 16 }}>{msg}</div>}

      {tab === "narocila" && (
        <div className="ckcard" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
            <thead>
              <tr style={{ background: "var(--navy)", color: "#fff", textAlign: "left" }}>
                {["Št.", "Datum", "Kupec", "Plačilo", "Znesek", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders === null ? (
                <tr><td colSpan={7} style={{ padding: 20 }}>Nalagam ...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, color: "var(--gray)" }}>Še ni naročil. Ko kupec odda naročilo, se pojavi tukaj.</td></tr>
              ) : (
                orders.map((o) => (
                  <FragmentRow key={o.id} o={o} open={open === o.id} toggle={() => setOpen(open === o.id ? null : o.id)} setStatus={setStatus} />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "zaloga" && (
        <div className="ckcard" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
            <thead>
              <tr style={{ background: "var(--navy)", color: "#fff", textAlign: "left" }}>
                {["Print", "SKU", "Velikost", "Zaloga", "Popravek"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock === null ? (
                <tr><td colSpan={5} style={{ padding: 20 }}>Nalagam ...</td></tr>
              ) : stock.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, color: "var(--gray)" }}>Baza je prazna — klikni "Uvozi katalog v bazo" zgoraj.</td></tr>
              ) : (
                stock.map((r) => (
                  <tr key={r.sku} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.name}</td>
                    <td style={{ padding: "8px 12px", color: "var(--gray)" }}>{r.sku}</td>
                    <td style={{ padding: "8px 12px" }}>{r.size}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 800, color: r.stock === 0 ? "#E23D3D" : r.stock <= 2 ? "#B07D2B" : "inherit" }}>{r.stock}</td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                      <button className="chip" style={{ padding: "2px 10px" }} onClick={() => adjust(r.sku, -1)}>−1</button>{" "}
                      <button className="chip" style={{ padding: "2px 10px" }} onClick={() => adjust(r.sku, 1)}>+1</button>{" "}
                      <button className="chip" style={{ padding: "2px 10px" }} onClick={() => adjust(r.sku, 5)}>+5</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function FragmentRow({ o, open, toggle, setStatus }) {
  return (
    <>
      <tr style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }} onClick={toggle}>
        <td style={{ padding: "8px 12px", fontWeight: 800 }}>#{o.number}</td>
        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{new Date(o.created_at).toLocaleString("sl-SI", { dateStyle: "short", timeStyle: "short" })}</td>
        <td style={{ padding: "8px 12px" }}>{o.name}<br /><span style={{ color: "var(--gray)", fontSize: ".78rem" }}>{o.email}</span></td>
        <td style={{ padding: "8px 12px" }}>{PAY[o.payment] || o.payment}</td>
        <td style={{ padding: "8px 12px", fontWeight: 800 }}>{fmtC(o.total_cents)}</td>
        <td style={{ padding: "8px 12px" }}>
          <span style={{ background: SCOLOR[o.status], color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: ".74rem", fontWeight: 800, textTransform: "uppercase" }}>
            {SLABEL[o.status] || o.status}
          </span>
        </td>
        <td style={{ padding: "8px 12px" }}>{open ? "▲" : "▼"}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} style={{ padding: "12px 16px", background: "var(--bg)" }}>
            <b>Dostava:</b> {o.address}, {o.zip} {o.city} {o.phone ? `· ${o.phone}` : ""}<br />
            <b>Postavke:</b>
            <ul style={{ margin: "6px 0 10px 18px" }}>
              {o.items.map((it, i) => (
                <li key={i}>
                  {it.qty}× {it.name} ({it.size}) — {fmtC(it.price_cents)}
                  {it.bundle_key ? " · Paket 3 (−15 %)" : ""}
                </li>
              ))}
            </ul>
            <b>Znesek:</b> blago {fmtC(o.subtotal_cents)} · dostava {fmtC(o.shipping_cents)}
            {o.cod_fee_cents ? ` · odkupnina ${fmtC(o.cod_fee_cents)}` : ""} · <b>skupaj {fmtC(o.total_cents)}</b>
            <div style={{ marginTop: 10 }}>
              <b>Status:</b>{" "}
              {STATUSES.map((s) => (
                <button key={s} className={`chip ${o.status === s ? "active" : ""}`}
                  style={{ padding: "3px 12px", marginRight: 6 }}
                  onClick={(e) => { e.stopPropagation(); setStatus(o.id, s); }}>
                  {SLABEL[s]}
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
