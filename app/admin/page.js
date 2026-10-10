"use client";
import { Fragment, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { LOGO_WHITE } from "../../lib/brand";
import "./admin.css";

/* ---------- pomočniki ---------- */
const eur = (c) =>
  (Number(c || 0) / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const eur0 = (c) => (Number(c || 0) / 100).toLocaleString("sl-SI", { maximumFractionDigits: 0 }) + " €";
const dt = (d) => new Date(d).toLocaleString("sl-SI", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dShort = (d) => new Date(d).toLocaleDateString("sl-SI", { day: "numeric", month: "numeric", year: "numeric" });
const PAY = { card: "Kartica", proforma: "Predračun", cod: "Po povzetju", shopify: "Shopify" };
const STATUSES = ["novo", "placano", "poslano", "zakljuceno", "preklicano"];
const SLABEL = { novo: "Novo", placano: "Plačano", poslano: "Poslano", zakljuceno: "Zaključeno", preklicano: "Preklicano" };
/** Kje v postopku je naročilo — kaj moramo narediti. */
function stageOf(o) {
  if (o.status === "preklicano") return "preklicano";
  if (o.status === "zakljuceno") return "zakljuceno";
  if (o.status === "poslano") return "poslano";
  if (!o.paid_at && (o.payment === "proforma" || o.payment === "card")) return "caka";
  return "posiljanje";
}
const STAGES = [
  ["posiljanje", "📦 Za pošiljanje", "Plačano ali po povzetju — zapakiraj, vpiši sledilno številko in klikni »Poslano«."],
  ["caka", "⏳ Čaka plačilo", "Predračun še ni plačan (ali kartično plačilo ni bilo dokončano). Ko denar prispe, klikni »Plačano«."],
  ["poslano", "🚚 Poslano", "Na poti h kupcu. Račun je bil izdan in poslan ob odpremi."],
  ["zakljuceno", "✅ Zaključeno", ""],
  ["preklicano", "✖ Preklicano", ""],
];
const STAGE_LBL = Object.fromEntries(STAGES.map(([k, l]) => [k, l]));
const STD = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const sortSizes = (list) => {
  const rank = (x) => { const i = STD.indexOf(x); if (i > -1) return i; const n = parseInt(x, 10); return Number.isFinite(n) ? 100 + n : 1000; };
  return [...list].sort((a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b)));
};
const GROUP_LABEL = { boksarice: "Boksarice", kopalke: "Kopalke", oblacila: "Oblačila", obutev: "Obutev", dodatki: "Dodatki", perilo: "Spodnje perilo", embalaza: "Embalaža in POS" };
const GENDER_LABEL = { moski: "Moški", zenske: "Ženske", otroci: "Otroci" };
const groupKey = (p) => (p.gender === "moski" ? p.group : p.gender);
const GROUP_ORDER = ["boksarice", "kopalke", "oblacila", "obutev", "dodatki", "zenske", "otroci", "embalaza"];
const groupName = (k) => GROUP_LABEL[k] || GENDER_LABEL[k] || k;
const REASONS = { prejem: "Prejem blaga", inventura: "Inventura", rocno: "Ročno" };
const onum = (o) => (o.source === "shopify" ? `S#${o.number}` : `#${o.number}`);
const getJSON = (url, opt) => fetch(url, opt).then((r) => r.json()).catch(() => null);

function Thumb({ src, sm }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className={`adm-thumb${sm ? " sm" : ""}`} />;
  return <img className={`adm-thumb${sm ? " sm" : ""}`} src={src} alt="" loading="lazy" onError={() => setBad(true)} />;
}
function Logo() {
  const [bad, setBad] = useState(false);
  const ref = (el) => { if (el && el.complete && el.naturalWidth === 0 && !bad) setBad(true); };
  return bad ? <span className="wm">69SLAM</span> : <img ref={ref} src={LOGO_WHITE} alt="69SLAM" onError={() => setBad(true)} />;
}
const Pill = ({ s }) => <span className={`adm-pill ${s}`}>{SLABEL[s] || s}</span>;

/* =================================================================== */
export default function Admin() {
  const [view, setView] = useState("dashboard");
  const [menu, setMenu] = useState(false);
  const [orders, setOrders] = useState(null);
  const [stock, setStock] = useState(null);
  const [nodb, setNodb] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  const [revCount, setRevCount] = useState(0);

  const loadOrders = useCallback(async () => {
    const d = await getJSON("/api/admin/orders");
    if (d?.nodb) setNodb(true);
    setOrders(d?.orders || []);
  }, []);
  const loadStock = useCallback(async () => {
    const d = await getJSON("/api/admin/stock");
    setStock(d?.products || []);
  }, []);
  useEffect(() => { loadOrders(); loadStock(); }, [loadOrders, loadStock]);
  useEffect(() => { getJSON("/api/admin/reviews").then((d) => setRevCount((d?.reviews || []).filter((r) => r.status === "caka").length)); }, []);

  const newCount = (orders || []).filter((o) => o.source !== "shopify" && ["posiljanje", "caka"].includes(stageOf(o))).length;
  const lowCount = (stock || []).filter((p) => Object.values(p.sizes).some((v) => v.stock > 0 && v.stock <= 2)).length;

  function go(v) { setView(v); setMenu(false); window.scrollTo(0, 0); }
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/prijava";
  }
  async function setStatus(id, status, tracking) {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, tracking }) });
    await Promise.all([loadOrders(), loadStock()]);
  }

  const NAV = [
    { id: "dashboard", ico: "📊", lbl: "Dashboard" },
    { id: "narocila", ico: "📦", lbl: "Naročila", bdg: newCount || null },
    { id: "zaloga", ico: "👕", lbl: "Artikli" },
    { id: "stranke", ico: "👤", lbl: "Stranke" },
    { id: "kode", ico: "🏷️", lbl: "Kode za popust" },
    { sep: 1 },
    { id: "racuni", ico: "🧾", lbl: "Računi & dokumenti" },
    { id: "prevzemi", ico: "📥", lbl: "Prevzemi" },
    { id: "inventura", ico: "📋", lbl: "Inventura" },
    { id: "cenik", ico: "💶", lbl: "Cenik & RVC" },
    { sep: 2 },
    { id: "maili", ico: "✉️", lbl: "E-maili" },
    { id: "ocene", ico: "⭐", lbl: "Ocene", bdg: revCount || null },
  ];
  const orderObj = openOrder ? (orders || []).find((o) => o.id === openOrder) : null;

  return (
    <div className="adm">
      <div className="adm-mtop">
        <button onClick={() => setMenu(true)} aria-label="Meni">☰</button>
        <Logo />
      </div>

      <aside className={`adm-side${menu ? " open" : ""}`} onClick={(e) => e.target === e.currentTarget && setMenu(false)}>
        <div className="adm-brand">
          <Logo />
          <small>ADMIN · CMS</small>
        </div>
        <nav className="adm-nav">
          {NAV.map((n) => n.sep ? <div key={"sep" + n.sep} className="adm-nav-sep" /> : (
            <button key={n.id} className={view === n.id ? "on" : ""} disabled={n.soon} onClick={() => go(n.id)}>
              <span className="ico">{n.ico}</span>
              <span className="lbl">{n.lbl}</span>
              {n.soon && <span className="soon">kmalu</span>}
              {n.bdg ? <span className={`bdg${n.warn ? " warn" : ""}`}>{n.bdg}</span> : null}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <nav className="adm-nav out">
          <a href="/" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <button><span className="ico">↗</span><span className="lbl">Odpri trgovino</span></button>
          </a>
          <button onClick={logout}><span className="ico">⎋</span><span className="lbl">Odjava</span></button>
        </nav>
      </aside>

      <main className="adm-main">
        {nodb && (
          <div className="adm-note">
            ⚠️ Baza ni povezana. V Vercelu: Storage → Neon (Postgres) → poveži s projektom in redeployaj.
          </div>
        )}
        {view === "dashboard" && <Dashboard onOpenOrder={(id) => { setOpenOrder(id); }} goOrders={() => go("narocila")}
          toShip={(orders || []).filter((o) => o.source !== "shopify" && stageOf(o) === "posiljanje").length}
          waiting={(orders || []).filter((o) => o.source !== "shopify" && stageOf(o) === "caka").length} />}
        {view === "narocila" && <Orders orders={orders} onOpen={setOpenOrder} />}
        {view === "zaloga" && <Stock stock={stock} reload={loadStock} />}
        {view === "inventura" && <Inventory stock={stock} reload={loadStock} />}
        {view === "prevzemi" && <Receipts stock={stock} reloadStock={loadStock} />}
        {view === "cenik" && <PriceList />}
        {view === "kode" && <Coupons />}
        {view === "stranke" && <Customers reloadOrders={loadOrders} />}
        {view === "racuni" && <Invoices />}
        {view === "maili" && <Mailing stock={stock} />}
        {view === "ocene" && <Reviews onCount={setRevCount} />}
      </main>

      {orderObj && <OrderPanel o={orderObj} onClose={() => setOpenOrder(null)} setStatus={setStatus}
        onDeleted={async () => { setOpenOrder(null); await Promise.all([loadOrders(), loadStock()]); }} />}
      <PdfViewer />
    </div>
  );
}

/* =========================== DASHBOARD =========================== */
const KIND_NAME_UI = { racun: "Račun", dobropis: "Dobropis", predracun: "Predračun", dobavnica: "Dobavnico" };
const MESECI = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
function Dashboard({ onOpenOrder, goOrders, toShip = 0, waiting = 0 }) {
  const nowY = new Date().getFullYear(), nowM = new Date().getMonth() + 1;
  const [year, setYear] = useState(nowY);
  const [d, setD] = useState(null);
  const [r, setR] = useState(null);
  useEffect(() => { getJSON(`/api/admin/dashboard?days=30`).then((x) => setD(x || { ok: false })); }, []);
  useEffect(() => { setR(null); getJSON(`/api/admin/rvc?from=${year}-01-01&to=${year}-12-31`).then((x) => setR(x || { ok: false })); }, [year]);

  const lastM = year === nowY ? nowM : 12;
  const byYm = Object.fromEntries((r?.months || []).map((m) => [m.ym, m]));
  const rows = Array.from({ length: lastM }, (_, i) => {
    const ym = `${year}-${String(i + 1).padStart(2, "0")}`;
    const m = byYm[ym] || {};
    const sh = m.shipping || 0;
    return { ym, name: MESECI[i], orders: m.orders || 0, qty: m.qty || 0,
      gross: (m.gross || 0) + sh, net: (m.net || 0) + Math.round(sh / 1.22), cost: m.cost || 0, rvc: m.rvc || 0, services: m.services || 0, miss: m.missQty || 0 };
  });
  const sum = rows.reduce((a, x) => { for (const k of ["orders", "qty", "gross", "net", "cost", "rvc", "services", "miss"]) a[k] += x[k]; return a; },
    { orders: 0, qty: 0, gross: 0, net: 0, cost: 0, rvc: 0, services: 0, miss: 0 });
  const cur = rows[rows.length - 1];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + " %" : "—");
  const maxV = Math.max(1, ...rows.map((x) => x.net));
  const years = []; for (let y = nowY; y >= 2023; y--) years.push(y);

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Promet in čisti RVC po mesecih · vse skupaj: spletna naročila, računi iz CMS in arhiv Metakocke (preklicano in stornirano ni šteto)</div>
        </div>
        <div className="grow" />
        <div className="adm-seg">
          {years.map((y) => <button key={y} className={year === y ? "on" : ""} onClick={() => setYear(y)}>{y}</button>)}
        </div>
      </div>

      {(toShip > 0 || waiting > 0) && (
        <button onClick={goOrders} className="adm-card" style={{ width: "100%", textAlign: "left", padding: "14px 18px", marginBottom: 14, cursor: "pointer",
          background: toShip ? "#fff4f4" : "#fff8e1", border: `1px solid ${toShip ? "#f3c2c6" : "#f0e0a0"}` }}>
          <b style={{ fontSize: 15 }}>{toShip ? `📦 ${toShip} ${toShip === 1 ? "naročilo čaka" : "naročil čaka"} na pošiljanje` : ""}
          {toShip && waiting ? " · " : ""}{waiting ? `⏳ ${waiting} čaka plačilo` : ""}</b>
          <span style={{ color: "var(--a-muted)", fontSize: 13 }}> — odpri naročila →</span>
        </button>
      )}

      <div className="adm-stats">
        <div className="adm-card adm-stat">
          <div className="k">Promet · {cur ? cur.name.toLowerCase() : ""}</div>
          <div className="v">{r ? eur(cur?.gross || 0) : "…"}</div>
          <div className="d">{r ? `${eur(cur?.net || 0)} brez DDV · ${cur?.orders || 0} prodaj` : " "}</div>
        </div>
        <div className="adm-card adm-stat">
          <div className="k">Čisti RVC · {cur ? cur.name.toLowerCase() : ""}</div>
          <div className="v" style={{ color: "#047857" }}>{r ? eur(cur?.rvc || 0) : "…"}</div>
          <div className="d">{r ? `marža ${pct(cur?.rvc || 0, cur?.net || 0)}` : " "}</div>
        </div>
        <div className="adm-card adm-stat">
          <div className="k">Promet · {year === nowY ? "letos" : year}</div>
          <div className="v">{r ? eur(sum.gross) : "…"}</div>
          <div className="d">{r ? `${eur(sum.net)} brez DDV · povpr. ${eur(Math.round(sum.gross / Math.max(1, rows.length)))}/mesec` : " "}</div>
        </div>
        <div className="adm-card adm-stat">
          <div className="k">Čisti RVC · {year === nowY ? "letos" : year}</div>
          <div className="v" style={{ color: "#047857" }}>{r ? eur(sum.rvc) : "…"}</div>
          <div className="d">{r ? `marža ${pct(sum.rvc, sum.net)} · povpr. ${eur(Math.round(sum.rvc / Math.max(1, rows.length)))}/mesec` : " "}</div>
        </div>
      </div>

      <div className="adm-card" style={{ marginBottom: 16 }}>
        <div className="adm-card-h">
          <h3>Po mesecih {year}</h3>
          <span style={{ fontSize: 12, color: "var(--a-muted)", display: "flex", gap: 14 }}>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#3b82f6", marginRight: 5 }} />promet brez DDV</span>
            <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "#10b981", marginRight: 5 }} />čisti RVC</span>
          </span>
        </div>
        {!r ? <div className="adm-empty">Nalagam …</div> : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200, padding: "8px 4px 0", overflowX: "auto" }}>
            {rows.map((x) => (
              <div key={x.ym} title={`${x.name}: promet ${eur(x.net)} brez DDV · RVC ${eur(x.rvc)}`} style={{ flex: "1 0 34px", display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
                  <div style={{ width: "42%", maxWidth: 22, height: `${(x.net / maxV) * 100}%`, minHeight: x.net ? 2 : 0, background: "#3b82f6", borderRadius: "4px 4px 0 0" }} />
                  <div style={{ width: "42%", maxWidth: 22, height: `${(Math.max(0, x.rvc) / maxV) * 100}%`, minHeight: x.rvc > 0 ? 2 : 0, background: "#10b981", borderRadius: "4px 4px 0 0" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--a-muted)", marginTop: 6 }}>{x.name.slice(0, 3)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="adm-scroll" style={{ marginTop: 14 }}>
          <table className="adm-tbl">
            <thead><tr><th>Mesec</th><th className="r">Prodaj</th><th className="r">Kosov</th><th className="r">Promet z DDV</th><th className="r">Promet brez DDV</th><th className="r">Nabavna</th><th className="r">Čisti RVC</th><th className="r">Marža</th></tr></thead>
            <tbody>
              {!r ? <tr><td colSpan={8} className="adm-empty">Nalagam …</td></tr> : rows.slice().reverse().map((x) => (
                <tr key={x.ym} style={x.ym === `${nowY}-${String(nowM).padStart(2, "0")}` ? { background: "#f5f9ff" } : undefined}>
                  <td className="strong">{x.name}</td>
                  <td className="r num">{x.orders}</td>
                  <td className="r num">{x.qty}</td>
                  <td className="r num strong">{eur(x.gross)}</td>
                  <td className="r num">{eur(x.net)}</td>
                  <td className="r num muted">{eur(x.cost)}</td>
                  <td className="r num strong" style={{ color: x.rvc >= 0 ? "#047857" : "#b91c1c" }}>{eur(x.rvc)}</td>
                  <td className="r num">{pct(x.rvc, x.net)}</td>
                </tr>))}
              {r && <tr style={{ borderTop: "2px solid #0a0a0a" }}>
                <td className="strong">Skupaj {year}</td>
                <td className="r num strong">{sum.orders}</td>
                <td className="r num strong">{sum.qty}</td>
                <td className="r num strong">{eur(sum.gross)}</td>
                <td className="r num strong">{eur(sum.net)}</td>
                <td className="r num strong">{eur(sum.cost)}</td>
                <td className="r num strong" style={{ color: "#047857" }}>{eur(sum.rvc)}</td>
                <td className="r num strong">{pct(sum.rvc, sum.net)}</td>
              </tr>}
            </tbody>
          </table>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
          Promet vključuje poštnino in storitve (npr. marketing). Čisti RVC = prodaja brez DDV − nabavna cena artiklov (poštnina ni všteta; storitve štejejo v celoti).
          {sum.miss > 0 && ` ⚠️ Za ${sum.miss} kosov ni nabavne cene — pri njih RVC ni štet (Cenik & RVC).`}
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-card">
          <div className="adm-card-h"><h3>Prodaja po dnevih</h3><span className="sub" style={{ fontSize: 12, color: "var(--a-muted)" }}>spletna naročila · zadnjih 30 dni</span></div>
          {d?.series ? <BarChart series={d.series} /> : <div className="adm-empty">Nalagam …</div>}
        </div>
        <div className="adm-card">
          <div className="adm-card-h"><h3>Top 5 printov</h3><span className="sub" style={{ fontSize: 12, color: "var(--a-muted)" }}>zadnjih 30 dni</span></div>
          <Top5 top={d?.top} />
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h" style={{ paddingBottom: 12 }}>
          <h3>Zadnja naročila</h3>
          <button className="lnk" onClick={goOrders}>Vsa naročila →</button>
        </div>
        <div className="adm-scroll">
          <table className="adm-tbl">
            <thead><tr><th>Št.</th><th>Kupec</th><th>Datum</th><th>Status</th><th className="r">Znesek</th></tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={8} className="adm-empty">Nalagam …</td></tr> :
               !d.recent?.length ? <tr><td colSpan={5} className="adm-empty">Še ni naročil.</td></tr> :
               d.recent.map((o) => (
                <tr key={o.id} className="click" onClick={() => onOpenOrder(o.id)}>
                  <td className="strong">{onum(o)}</td>
                  <td>{o.name}<div className="muted">{o.email}</div></td>
                  <td className="muted">{dt(o.created_at)}</td>
                  <td><Pill s={o.status} /></td>
                  <td className="r strong num">{eur(o.total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function BarChart({ series }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...series.map((x) => x.revenue), 0);
  const nice = (() => {
    if (max <= 0) return 10000;
    const raw = max / 100, p = Math.pow(10, Math.floor(Math.log10(raw / 4)));
    const step = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((m) => m * p * 4 >= raw) * p;
    return step * 4 * 100;
  })();
  const lines = [0.25, 0.5, 0.75, 1];
  const every = series.length > 31 ? 14 : series.length > 8 ? 5 : 1;
  const lbl = (d) => { const [, m, dd] = d.split("-"); return `${+dd}. ${+m}.`; };
  return (
    <div className="adm-chart">
      <div className="adm-chart-wrap">
        <div className="plot">
          {lines.map((f) => (
            <div key={f} className="gl" style={{ bottom: `${f * (100 - 8)}%` }}><span>{eur0(nice * f)}</span></div>
          ))}
          {series.map((x, i) => (
            <div key={x.d} className={`col${x.revenue ? "" : " zero"}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className="bar" style={{ height: `${(x.revenue / nice) * (100 - 8)}%` }} />
              {hover === i && (
                <div className="tip"><b>{eur(x.revenue)}</b>{lbl(x.d)} · {x.orders} {x.orders === 1 ? "naročilo" : x.orders === 2 ? "naročili" : x.orders < 5 && x.orders > 0 ? "naročila" : "naročil"}</div>
              )}
            </div>
          ))}
        </div>
        <div className="xl">
          {series.map((x, i) => <span key={x.d}>{(series.length - 1 - i) % every === 0 ? lbl(x.d) : ""}</span>)}
        </div>
      </div>
    </div>
  );
}

function Top5({ top }) {
  if (!top) return <div className="adm-empty">Nalagam …</div>;
  if (!top.length) return <div className="adm-empty">V tem obdobju še ni prodanih kosov.</div>;
  const max = Math.max(...top.map((t) => t.qty));
  return (
    <div className="adm-top5">
      {top.map((t, i) => (
        <div className="it" key={t.code}>
          <span className="rk">{i + 1}</span>
          <Thumb src={t.img} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nm">{t.name}</div>
            <div className="meter"><i style={{ width: `${(t.qty / max) * 100}%` }} /></div>
          </div>
          <span className="q">{t.qty} kos</span>
        </div>
      ))}
    </div>
  );
}

/* =========================== NAROČILA =========================== */
function Orders({ orders, onOpen }) {
  const counts = useMemo(() => {
    const c = { vsa: (orders || []).length };
    for (const [k] of STAGES) c[k] = (orders || []).filter((o) => stageOf(o) === k).length;
    return c;
  }, [orders]);
  const [f, setF] = useState(null);
  const cur = f || (counts.posiljanje ? "posiljanje" : counts.caka ? "caka" : "vsa");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (orders || []).filter((o) =>
      (cur === "vsa" || stageOf(o) === cur) &&
      (!t || `${o.number} ${o.name} ${o.email} ${o.city}`.toLowerCase().includes(t)));
  }, [orders, cur, q]);
  const hint = STAGES.find(([k]) => k === cur)?.[2];
  const isNew = (o) => Date.now() - new Date(o.created_at).getTime() < 24 * 3600 * 1000;

  return (
    <>
      <div className="adm-top">
        <div><h1>Naročila</h1><div className="sub">Klikni naročilo za podrobnosti in spremembo statusa.</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        {STAGES.slice(0, 3).map(([k, l]) => (
          <button key={k} onClick={() => setF(k)} className="adm-card" style={{ textAlign: "left", padding: "14px 16px", cursor: "pointer",
            border: cur === k ? "2px solid #0a0a0a" : undefined, background: k === "posiljanje" && counts[k] ? "#fff4f4" : undefined }}>
            <div style={{ fontSize: 13, color: "var(--a-muted)", fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: k === "posiljanje" && counts[k] ? "#e63946" : undefined }}>{counts[k] || 0}</div>
          </button>
        ))}
      </div>
      <div className="adm-bar">
        <div className="adm-chips">
          {[...STAGES.map(([k]) => k), "vsa"].map((s) => (
            <button key={s} className={cur === s ? "on" : ""} onClick={() => setF(s)}>
              {s === "vsa" ? "Vsa" : STAGE_LBL[s]} <span className="c">{counts[s] || 0}</span>
            </button>
          ))}
        </div>
        <div className="adm-search"><input placeholder="Išči: št., ime, e-mail …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      {hint && <div className="adm-note" style={{ marginBottom: 12 }}>{hint}</div>}
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Št.</th><th>Datum</th><th>Kupec</th><th>Plačilo</th><th>Stanje</th><th className="r">Znesek</th></tr></thead>
          <tbody>
            {orders === null ? <tr><td colSpan={6} className="adm-empty">Nalagam …</td></tr> :
             !list.length ? <tr><td colSpan={6} className="adm-empty">{orders.length ? "Tukaj ni naročil." : "Še ni naročil. Ko kupec odda naročilo, se pojavi tukaj."}</td></tr> :
             list.map((o) => (
              <tr key={o.id} className="click" onClick={() => onOpen(o.id)}>
                <td className="strong">{onum(o)}{isNew(o) && o.source !== "shopify" && <span style={{ marginLeft: 6, background: "#e63946", color: "#fff", borderRadius: 50, padding: "2px 7px", fontSize: 10, fontWeight: 800 }}>NOVO</span>}</td>
                <td className="muted">{dt(o.created_at)}</td>
                <td>{o.name}<div className="muted">{o.email}</div></td>
                <td>{PAY[o.payment] || o.payment}{o.paid_at ? <div className="muted">✓ plačano</div> : null}</td>
                <td><b style={{ fontSize: 13 }}>{STAGE_LBL[stageOf(o)]}</b></td>
                <td className="r strong num">{eur(o.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrderInvoice({ orderId, status, shopify }) {
  const [inv, setInv] = useState(undefined);
  const [crs, setCrs] = useState([]);
  const [credit, setCredit] = useState(false);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => {
    const d = await getJSON(`/api/admin/invoices?order=${orderId}`);
    const all = d?.invoices || [];
    setInv(all.find((x) => x.kind === "racun" && x.status !== "storniran") || null);
    setCrs(all.filter((x) => x.kind === "dobropis" && x.status !== "storniran"));
  }, [orderId]);
  useEffect(() => { load(); }, [load, status]);
  if (inv === undefined || (shopify && !inv && !crs.length)) return null;
  const credited = inv ? crs.filter((c) => String(c.source_id) === String(inv.id) || c.ref_number === inv.number).reduce((a, c) => a - c.total_cents, 0) : 0;
  const canCredit = inv && inv.series !== "MK" && credited < inv.total_cents;
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="adm-note" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: crs.length || msg ? 6 : 0 }}>
        🧾 {inv ? <>Račun <b>{inv.number}</b>{inv.series === "MK" ? " · arhiv Metakocka" : ""}{inv.sent_at ? " · ✉️ poslan" : ""}{credited > 0 ? (credited >= inv.total_cents ? " · ↩️ v celoti dobropisan" : ` · ↩️ dobropis ${eur(credited)}`) : ""}<div className="grow" />
            {canCredit && <button className="adm-btn" onClick={() => setCredit(true)}>↩️ Dobropis</button>}
            <button className="adm-btn" onClick={() => openPdfId(inv.id, pdfName(inv))}>PDF</button></>
          : shopify ? <>Račun za to naročilo ni v arhivu.</> : <>Račun se naredi in pošlje sam, ko klikneš <b>Poslano</b>.<div className="grow" /><button className="adm-btn" onClick={async () => { await post("/api/admin/invoices", { action: "order", order_id: orderId }); load(); }}>Izdaj zdaj</button></>}
      </div>
      {crs.map((c) => (
        <div key={c.id} className="adm-note" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6, background: "#fff8e1", color: "#5c4a00" }}>
          ↩️ Dobropis <b>{c.number}</b> · {eur(c.total_cents)}{c.ref_number ? ` · k računu ${c.ref_number}` : ""}{c.sent_at ? " · ✉️ poslan" : ""}
          <div className="grow" /><button className="adm-btn" onClick={() => openPdfId(c.id, pdfName(c))}>PDF</button>
        </div>
      ))}
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {credit && inv && <CreditModal inv={inv} onClose={() => setCredit(false)} onDone={(m) => { setCredit(false); setMsg(m); load(); }} />}
    </div>
  );
}

const MAIL_KIND = { potrditev: "Potrditev naročila", poslano: "Paket je na poti" };
const MAIL_ST = {
  delivered: ["✅ dostavljeno", "#059669"], opened: ["✅ dostavljeno · odprto", "#059669"], clicked: ["✅ dostavljeno · odprto", "#059669"],
  sent: ["⏳ poslano, čaka dostavo", "#b45309"], queued: ["⏳ v vrsti", "#b45309"], scheduled: ["⏳ v vrsti", "#b45309"], delivery_delayed: ["⏳ dostava zamuja", "#b45309"],
  bounced: ["❌ ni dostavljeno (napačen naslov)", "#e63946"], complained: ["⚠️ označeno kot vsiljena pošta", "#e63946"], napaka: ["❌ napaka pri pošiljanju", "#e63946"], failed: ["❌ pošiljanje ni uspelo", "#e63946"], suppressed: ["❌ naslov je blokiran (prej zavrnjen)", "#e63946"], canceled: ["✕ preklicano", "#666"],
};
/** Kateri maili so šli kupcu in ali so bili dostavljeni. */
function OrderMails({ orderId, status }) {
  const [d, setD] = useState(null);
  useEffect(() => { let on = true; getJSON(`/api/admin/orders?id=${orderId}&mails=1`).then((x) => on && setD(x || { log: [] })); return () => { on = false; }; }, [orderId, status]);
  if (!d) return null;
  const rows = d.log || [];
  const legacy = !rows.length && (d.legacy?.confirm_at || d.legacy?.invoices?.length);
  return (
    <>
      <div className="adm-sec">📧 Maili kupcu</div>
      {!rows.length && !legacy && <div className="muted">Kupcu še ni bil poslan noben mail.</div>}
      {rows.map((m, i) => {
        const st = MAIL_ST[m.status] || [m.status ? m.status : "poslano", "#666"];
        return (
          <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--a-line, #eee)", fontSize: 13 }}>
            <div><b>{MAIL_KIND[m.kind] || m.kind}</b> <span className="muted">· {dt(m.at)}</span></div>
            <div className="muted">na {m.email}{m.attachment ? <> · 📎 {m.attachment}</> : null}</div>
            <div style={{ color: st[1], fontWeight: 700 }}>{st[0]}</div>
            {m.error && <div style={{ color: "#e63946" }}>{m.error}</div>}
          </div>
        );
      })}
      {legacy && (
        <div className="muted" style={{ fontSize: 13 }}>
          {d.legacy.confirm_at && <div>✅ Potrditev naročila poslana · {dt(d.legacy.confirm_at)}</div>}
          {(d.legacy.invoices || []).map((v) => <div key={v.number}>✅ Račun {v.number} poslan na {v.sent_to} · {dt(v.sent_at)}</div>)}
          <div style={{ marginTop: 4 }}>Stanje dostave se beleži za maile od 7. 10. 2026 naprej.</div>
        </div>
      )}
    </>
  );
}

function OrderPanel({ o, onClose, setStatus, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [trk, setTrk] = useState(o.tracking || "");
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  async function change(s) {
    if (s === o.status) return;
    if (s === "preklicano" && !confirm(o.source === "shopify"
      ? "Označim naročilo kot preklicano?"
      : "Prekličem naročilo? Kosi se vrnejo na zalogo.")) return;
    setBusy(true); await setStatus(o.id, s, trk); setBusy(false);
  }
  const items = o.items || [];
  return (
    <div className="adm-ov side" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-panel">
        <div className="adm-mh">
          <div>
            <h3>Naročilo {onum(o)}</h3>
            <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <Pill s={o.status} /><span style={{ color: "var(--a-muted)", fontSize: 12.5 }}>{dt(o.created_at)}</span>
            </div>
          </div>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="adm-mb">
          <OrderInvoice orderId={o.id} status={o.status} shopify={o.source === "shopify"} />
          <div className="adm-sec" style={{ marginTop: 0 }}>Spremeni status</div>
          <div className="adm-status">
            {STATUSES.map((s) => (
              <button key={s} disabled={busy} className={o.status === s ? "on" : ""} onClick={() => change(s)}>{SLABEL[s]}</button>
            ))}
          </div>

          {o.source !== "shopify" && (
            <div className="adm-field" style={{ marginTop: 12 }}>
              <label>Sledilna številka Pošte (vpiši pred »Poslano«)</label>
              <input value={trk} onChange={(e) => setTrk(e.target.value)} placeholder="npr. RB123456789SI" />
              <div className="muted" style={{ marginTop: 6 }}>Ko klikneš »Poslano«, kupec dobi e-mail »Paket je na poti« s to številko.</div>
            </div>
          )}

          {o.source !== "shopify" && <OrderMails orderId={o.id} status={o.status} />}

          <div className="adm-sec">Kupec in dostava</div>
          <dl className="adm-dl">
            <dt>Ime</dt><dd><b>{o.name}</b></dd>
            <dt>E-mail</dt><dd><a href={`mailto:${o.email}`} style={{ color: "var(--a-blue)" }}>{o.email}</a></dd>
            {o.phone && <><dt>Telefon</dt><dd>{o.phone}</dd></>}
            <dt>Naslov</dt><dd>{o.address}<br />{o.zip} {o.city}{o.country && o.country !== "SI" ? `, ${o.country}` : ""}</dd>
            <dt>Plačilo</dt><dd>{PAY[o.payment] || o.payment}{o.paid_at ? " · ✓ plačano" : ""}</dd>
            {o.coupon_code && <><dt>Koda</dt><dd><b>{o.coupon_code}</b> (popust {eur(o.discount_cents)})</dd></>}
            {o.source === "shopify" && <><dt>Izvor</dt><dd><span className="adm-tag">uvoz iz Shopifyja</span></dd></>}
          </dl>

          <div className="adm-sec">Postavke</div>
          <div className="adm-items">
            {items.length ? items.map((it, i) => (
              <div className="row" key={i}>
                {it.img ? <img src={it.img} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, background: "#f5f5f7", flex: "none" }} />
                  : <div style={{ width: 54, height: 54, borderRadius: 8, background: "#f5f5f7", flex: "none" }} />}
                <div className="g">
                  <b>{it.name}</b>
                  <div style={{ color: "var(--a-muted)", fontSize: 12.5 }}>
                    {it.sku} · vel. {it.size}{it.bundle_key ? " · Paket 3 (−15 %)" : ""}
                  </div>
                </div>
                <span style={{ color: "var(--a-muted)" }}>{it.qty}×</span>
                <b className="num">{eur(it.price_cents)}</b>
              </div>
            )) : <div className="row" style={{ color: "var(--a-muted)" }}>Ni postavk.</div>}
          </div>
          <div className="adm-tot">
            <div><span>Blago</span><span>{eur(o.subtotal_cents)}</span></div>
            <div><span>Dostava</span><span>{eur(o.shipping_cents)}</span></div>
            {o.cod_fee_cents ? <div><span>Odkupnina</span><span>{eur(o.cod_fee_cents)}</span></div> : null}
            <div className="all"><span>Skupaj</span><span>{eur(o.total_cents)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================== KODE ZA POPUST =========================== */
const isoDay = (v) => (v ? new Date(v).toLocaleDateString("sv-SE", { timeZone: "Europe/Ljubljana" }) : "");
function couponState(c) {
  const now = Date.now();
  if (!c.active) return ["izklopljena", ""];
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return ["čaka na začetek", "warn"];
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return ["potekla", ""];
  if (c.max_uses && c.uses >= c.max_uses) return ["porabljena", ""];
  return ["aktivna", "ok"];
}
const PERSONAL = /^(HVALA|KOSARICA)-/;
function Coupons() {
  const [all, setList] = useState(null);
  const [showP, setShowP] = useState(false);
  const list = all === null ? null : all.filter((c) => showP || !PERSONAL.test(c.code));
  const nP = (all || []).filter((c) => PERSONAL.test(c.code)).length;
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => { const d = await getJSON("/api/admin/coupons"); setList(d?.coupons || []); }, []);
  useEffect(() => { load(); }, [load]);
  const blank = { code: "", percent: "20", starts: "", ends: "", min_order: "", max_uses: "", once: false, active: true, note: "", stack: false };
  function edit(c) {
    setForm({ id: c.id, code: c.code, percent: String(c.percent), starts: isoDay(c.starts_at), ends: isoDay(c.expires_at),
      min_order: c.min_order_cents ? (c.min_order_cents / 100).toString().replace(".", ",") : "", max_uses: c.max_uses ? String(c.max_uses) : "",
      once: c.once_per_email, active: c.active, note: c.note || "", stack: !!c.stack });
  }
  async function save(e) {
    e.preventDefault();
    const d = await getJSON("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." });
    if (d?.ok) { setForm(null); load(); }
  }
  async function remove(c) {
    if (!confirm(`Izbrišem kodo ${c.code}?`)) return;
    const d = await getJSON(`/api/admin/coupons?id=${c.id}`, { method: "DELETE" });
    setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." }); load();
  }
  async function toggle(c) {
    await getJSON("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, code: c.code, percent: c.percent, starts: isoDay(c.starts_at), ends: isoDay(c.expires_at),
        min_order: c.min_order_cents ? c.min_order_cents / 100 : "", max_uses: c.max_uses || "", once: c.once_per_email, active: !c.active, note: c.note, stack: !!c.stack }) });
    load();
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  return (
    <>
      <div className="adm-top">
        <div><h1>Kode za popust</h1><div className="sub">Velja <b>boljši popust</b>: koda ALI Paket 3 / odprodaja — nikoli oba skupaj. Znižani artikli (−50 %) s kodo ne dobijo dodatnega popusta.</div></div>
        <div className="grow" />
        <button className="adm-btn pri" onClick={() => setForm({ ...blank })}>+ Nova koda</button>
      </div>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {nP > 0 && <label className="adm-check" style={{ marginBottom: 10 }}><input type="checkbox" checked={showP} onChange={(e) => setShowP(e.target.checked)} /> Pokaži tudi osebne kode iz e-mailov (HVALA-…, KOSARICA-…): {nP}</label>}
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Koda</th><th className="r">Popust</th><th>Velja</th><th>Pogoji</th><th className="r">Uporab</th><th className="r">Prodaja s kodo</th><th>Stanje</th><th></th></tr></thead>
          <tbody>
            {list === null ? <tr><td colSpan={8} className="adm-empty">Nalagam …</td></tr> :
             !list.length ? <tr><td colSpan={8} className="adm-empty">Še ni nobene kode — klikni »+ Nova koda«.</td></tr> :
             list.map((c) => { const [st, cls] = couponState(c); return (
              <tr key={c.id}>
                <td><div className="strong">{c.code}</div>{c.note && <div className="muted">{c.note}</div>}</td>
                <td className="r num strong">−{c.percent} %</td>
                <td className="muted">{c.starts_at ? isoDay(c.starts_at).split("-").reverse().join(". ") : "takoj"} – {c.expires_at ? isoDay(c.expires_at).split("-").reverse().join(". ") : "brez konca"}</td>
                <td className="muted">{[c.min_order_cents ? `nad ${eur(c.min_order_cents)}` : null, c.once_per_email ? "1× na kupca" : null, c.max_uses ? `največ ${c.max_uses}×` : null, c.stack ? "tudi na znižano" : null].filter(Boolean).join(" · ") || "—"}</td>
                <td className="r num">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                <td className="r num">{c.uses ? <>{eur(c.revenue_cents)}<div className="muted">popust {eur(c.discount_cents)}</div></> : "—"}</td>
                <td><span className={`adm-tag ${cls === "ok" ? "sub" : ""}`}>{st}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="adm-btn" onClick={() => edit(c)}>Uredi</button>{" "}
                  <button className="adm-btn" onClick={() => toggle(c)}>{c.active ? "Izklopi" : "Vklopi"}</button>{" "}
                  <button className="adm-btn" onClick={() => remove(c)}>✕</button>
                </td>
              </tr>); })}
          </tbody>
        </table>
      </div>
      {form && (
        <div className="adm-ov" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
          <form className="adm-modal" onSubmit={save} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
            <div className="adm-mh"><h3>{form.id ? `Uredi kodo ${form.code}` : "Nova koda za popust"}</h3><button type="button" className="x" onClick={() => setForm(null)}>✕</button></div>
            <div className="adm-mb">
              <div className="adm-field"><label>Koda (kupec jo vpiše na blagajni)</label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="npr. NOVA69SLAM" required /></div>
              <div className="adm-field"><label>Popust (%)</label>
                <input type="number" min="1" max="90" value={form.percent} onChange={set("percent")} required style={{ maxWidth: 120 }} /></div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="adm-field" style={{ flex: 1 }}><label>Velja od</label><input type="date" value={form.starts} onChange={set("starts")} /></div>
                <div className="adm-field" style={{ flex: 1 }}><label>Velja do (vključno)</label><input type="date" value={form.ends} onChange={set("ends")} /></div>
              </div>
              <div className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Prazno = velja takoj / brez konca.</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="adm-field" style={{ flex: 1 }}><label>Najmanjši nakup (€)</label><input inputMode="decimal" value={form.min_order} onChange={set("min_order")} placeholder="brez" /></div>
                <div className="adm-field" style={{ flex: 1 }}><label>Največ uporab skupaj</label><input type="number" min="1" value={form.max_uses} onChange={set("max_uses")} placeholder="neomejeno" /></div>
              </div>
              <label className="adm-check" style={{ marginBottom: 10 }}><input type="checkbox" checked={form.once} onChange={set("once")} /> Vsak kupec (e-mail) jo lahko uporabi samo 1×</label>
              <label className="adm-check" style={{ marginBottom: 10 }}><input type="checkbox" checked={!!form.stack} onChange={set("stack")} /> Velja tudi za že znižane izdelke (popust od znižane cene) — za opravičila in VIP</label>
              <label className="adm-check" style={{ marginBottom: 14 }}><input type="checkbox" checked={form.active} onChange={set("active")} /> Koda je vklopljena</label>
              <div className="adm-field"><label>Opomba (samo zate)</label><input value={form.note} onChange={set("note")} placeholder="npr. odprtje nove trgovine" /></div>
              <button className="adm-btn pri" type="submit">💾 Shrani kodo</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

/* =========================== ZALOGA =========================== */
function Stock({ stock, reload }) {
  const [f, setF] = useState("vsi");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // { p, size }
  const [msg, setMsg] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [open, setOpen] = useState(null); // koda artikla v urejanju

  const isLow = (p) => Object.values(p.sizes).some((v) => v.stock > 0 && v.stock <= 2);
  const FILTERS = [
    { id: "vsi", lbl: "Vsi", fn: () => true },
    { id: "low", lbl: "Samo pri koncu", fn: isLow },
    { id: "out", lbl: "Razprodano", fn: (p) => p.total === 0 },
    { id: "boks", lbl: "Boksarice", fn: (p) => p.gender === "moski" && p.group === "boksarice" },
    { id: "kop", lbl: "Kopalke", fn: (p) => p.gender === "moski" && p.group === "kopalke" },
    { id: "ost", lbl: "Ostalo moško", fn: (p) => p.gender === "moski" && !["boksarice", "kopalke"].includes(p.group) },
    { id: "zen", lbl: "Ženske −50 %", fn: (p) => p.gender === "zenske" },
    { id: "otr", lbl: "Otroci −50 %", fn: (p) => p.gender === "otroci" },
    { id: "off", lbl: "Ni na spletu", fn: (p) => !p.active },
    { id: "ready", lbl: "Ni na spletu · ima slike", fn: (p) => !p.active && (p.images || []).length > 0 },
  ];
  const list = useMemo(() => {
    const fn = FILTERS.find((x) => x.id === f).fn;
    const t = q.trim().toLowerCase();
    return (stock || []).filter((p) => fn(p) && (!t || `${p.name} ${p.code}`.toLowerCase().includes(t) ||
      Object.values(p.sizes).some((v) => v.sku.toLowerCase().includes(t))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, f, q]);
  const totals = useMemo(() => (stock || []).reduce((a, p) => a + p.total, 0), [stock]);
  const { cols, extra } = useMemo(() => {
    const all = sortSizes([...new Set(list.flatMap((p) => Object.keys(p.sizes)))]);
    if (all.length <= 9) return { cols: all.length ? all : STD.slice(0, 6), extra: false };
    return { cols: STD.filter((x) => all.includes(x)), extra: true };
  }, [list]);

  async function seed() {
    if (!confirm("Uvozim katalog v bazo? Nove variante dobijo začetno zalogo, obstoječa zaloga ostane nedotaknjena.")) return;
    setSeeding(true);
    const d = await getJSON("/api/admin/seed", { method: "POST" });
    setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." });
    setSeeding(false); reload();
  }

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Artikli</h1>
          <div className="sub">{stock ? `${stock.length} artiklov · ${totals} kosov na zalogi` : "Nalagam …"} · klikni artikel za urejanje, številko za popravek zaloge</div>
        </div>
        <div className="grow" />
        <button className="adm-btn" onClick={seed} disabled={seeding}>{seeding ? "Uvažam …" : "⬇ Uvozi katalog v bazo"}</button>
      </div>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div className="adm-bar">
        <div className="adm-chips">
          {FILTERS.map((x) => (
            <button key={x.id} className={f === x.id ? "on" : ""} onClick={() => setF(x.id)}>
              {x.lbl} <span className="c">{(stock || []).filter(x.fn).length}</span>
            </button>
          ))}
        </div>
        <div className="adm-search"><input placeholder="Išči: ime ali SKU …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl adm-mx">
          <thead>
            <tr>
              <th>Print</th>
              {cols.map((s) => <th key={s} className="sz">{s}</th>)}
              {extra && <th className="sz">Ostale vel.</th>}
              <th className="sz">Skupaj</th>
            </tr>
          </thead>
          <tbody>
            {stock === null ? <tr><td colSpan={cols.length + 3} className="adm-empty">Nalagam …</td></tr> :
             !stock.length ? <tr><td colSpan={cols.length + 3} className="adm-empty">Baza je prazna — klikni »Uvozi katalog v bazo« zgoraj.</td></tr> :
             !list.length ? <tr><td colSpan={cols.length + 3} className="adm-empty">Ni zadetkov.</td></tr> :
             list.map((p) => (
              <tr key={p.code}>
                <td style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setOpen(p.code)} title="Uredi artikel">
                    <Thumb src={p.img} sm />
                    <div>
                      <div className="strong adm-link">{p.name} <span className="adm-edit">✎</span></div>
                      <div className="muted">{p.code}{p.type ? ` · ${p.type}` : ""}{p.collection === "limited" ? " · limited" : ""}{!p.active ? " · ni na spletu" : ""}</div>
                    </div>
                  </div>
                </td>
                {cols.map((s) => {
                  const v = p.sizes[s];
                  if (!v) return <td key={s} className="cell"><span className="adm-cell none">—</span></td>;
                  const cls = v.stock === 0 ? "zero" : v.stock <= 2 ? "low" : "";
                  const sel = edit && edit.p.code === p.code && edit.size === s;
                  return (
                    <td key={s} className="cell">
                      <button className={`adm-cell ${cls}${sel ? " sel" : ""}`} title={`${v.sku} — popravi zalogo`} onClick={() => setEdit({ p, size: s })}>
                        {v.stock}
                      </button>
                    </td>
                  );
                })}
                {extra && (
                  <td className="cell" style={{ textAlign: "left" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {sortSizes(Object.keys(p.sizes).filter((x) => !cols.includes(x))).map((s) => {
                        const v = p.sizes[s];
                        const cls = v.stock === 0 ? "zero" : v.stock <= 2 ? "low" : "";
                        return (
                          <button key={s} className={`adm-cell ${cls}`} style={{ minWidth: 0, padding: "0 8px", fontSize: 12 }}
                            title={`${v.sku} — popravi zalogo`} onClick={() => setEdit({ p, size: s })}>
                            <span style={{ fontWeight: 500, marginRight: 4 }}>{s}</span>{v.stock}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                )}
                <td className="tot num">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="adm-bar" style={{ marginTop: 12 }}>
        <div className="adm-legend">
          <span><i style={{ background: "#FEE4E2" }} />0 = razprodano</span>
          <span><i style={{ background: "#FEF0C7" }} />1–2 = pri koncu</span>
          <span><i style={{ background: "#F0F2F5" }} />na zalogi</span>
        </div>
      </div>
      {open && (() => { const sp = (stock || []).find((x) => x.code === open); return sp ? (
        <ArticlePanel sp={sp} onClose={() => setOpen(null)} onStock={(size) => setEdit({ p: sp, size })}
          onSaved={async (t) => { setMsg({ ok: true, t }); await reload(); }} />) : null; })()}
      {edit && <StockModal p={edit.p} size={edit.size} onClose={() => setEdit(null)}
        onSaved={async (t) => { setEdit(null); setMsg({ ok: true, t }); await reload(); }} />}
    </>
  );
}

/* ---------- Urejanje artikla (naslov, opis, cena, objava, slike, zaloga) ---------- */
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / bmp.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
}
function ArticlePanel({ sp, onClose, onStock, onSaved }) {
  const [d, setD] = useState(null);
  const [f, setF] = useState(null);
  const [imgs, setImgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const load = useCallback(async () => {
    const x = await getJSON(`/api/admin/article?code=${encodeURIComponent(sp.code)}`);
    setD(x);
    if (x?.ok) {
      const e = x.edit || {};
      const pr = x.product;
      setF({ name: e.name ?? pr.name ?? "", type: e.type_sl ?? pr.type ?? "", description: e.description ?? pr.defaultDescription ?? "",
        price: (e.price_cents != null ? e.price_cents / 100 : pr.price).toFixed(2).replace(".", ","),
        published: e.published ?? null });
      setImgs(x.images || []);
    }
  }, [sp.code]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const P = d?.product;
  const pub = f?.published ?? P?.published;

  async function save() {
    setBusy(true); setNote(null);
    const x = await getJSON("/api/admin/article", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: sp.code, ...f, published: f.published }) });
    setBusy(false);
    setNote({ ok: !!x?.ok, t: x?.message || "Napaka pri shranjevanju." });
    if (x?.ok) { onSaved(`${P.name}: ${x.message}`); load(); }
  }
  async function imgAction(body) {
    setBusy(true);
    const x = await getJSON("/api/admin/article/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: sp.code, ...body }) });
    setBusy(false);
    if (x?.ok) { setImgs(x.images); setNote({ ok: true, t: "Slike shranjene — že na spletu." }); onSaved(`${P.name}: slike posodobljene.`); }
    else setNote({ ok: false, t: x?.message || "Napaka pri slikah." });
  }
  const move = (i, dir) => { const a = [...imgs]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; imgAction({ action: "order", urls: a }); };
  async function upload(files) {
    setBusy(true); let last = null;
    for (const file of files) {
      try {
        const blob = await shrinkImage(file);
        const r = await fetch(`/api/admin/article/images?code=${encodeURIComponent(sp.code)}&action=upload`, { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
        last = await r.json();
        if (!last?.ok) break;
      } catch { last = { ok: false, message: `Slike ${file.name} ni bilo mogoče prebrati (HEIC iz iPhona najprej shrani kot JPG).` }; break; }
    }
    setBusy(false);
    if (last?.ok) { setImgs(last.images); setNote({ ok: true, t: "Slike naložene — že na spletu." }); onSaved(`${P.name}: slike dodane.`); }
    else setNote({ ok: false, t: last?.message || "Napaka pri nalaganju." });
  }
  const sizes = sortSizes(Object.keys(sp.sizes));
  const shopUrl = P ? `/sl/p/${P.slug}` : null;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="adm-ov side" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-panel" style={{ maxWidth: 620 }}>
        <div className="adm-mh">
          <div>
            <h3>{P?.name || sp.name}</h3>
            <div className="muted" style={{ marginTop: 4 }}>{sp.code}{P ? ` · ${P.source === "metakocka" ? "iz Metakocke" : "iz Shopifyja"}` : ""}</div>
            {P && <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className={`adm-tag ${pub ? "sub" : ""}`}>{pub ? "✓ na spletu" : "ni na spletu"}</span>
              {pub && shopUrl && <a className="adm-tag" href={shopUrl} target="_blank" rel="noreferrer">Odpri v trgovini ↗</a>}
            </div>}
          </div>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="adm-mb">
          {note && <div className={`adm-note ${note.ok ? "ok" : "err"}`}>{note.t}</div>}
          {!d ? <div className="adm-empty">Nalagam …</div> : !d.ok ? <div className="adm-note err">{d.message}</div> : <>
            <div className="adm-sec">Zaloga po velikostih <span className="muted" style={{ fontWeight: 500, textTransform: "none" }}>· klikni za popravek</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
              {sizes.map((s) => { const v = sp.sizes[s]; const cls = v.stock === 0 ? "zero" : v.stock <= 2 ? "low" : "";
                return <button key={s} className={`adm-cell ${cls}`} style={{ minWidth: 0, padding: "0 10px" }} onClick={() => onStock(s)}>
                  <span style={{ fontWeight: 500, marginRight: 6 }}>{s}</span>{v.stock}</button>; })}
              <span className="muted" style={{ alignSelf: "center", marginLeft: 6 }}>skupaj {sp.total}</span>
            </div>

            <div className="adm-sec">Na spletu</div>
            <div className="adm-chips" style={{ marginBottom: 16 }}>
              <button className={f.published === null ? "on" : ""} onClick={() => setF((x) => ({ ...x, published: null }))}>Samodejno {f.published === null ? `(${P.published ? "objavljen" : "skrit"})` : ""}</button>
              <button className={f.published === true ? "on" : ""} onClick={() => setF((x) => ({ ...x, published: true }))}>✓ Objavljen</button>
              <button className={f.published === false ? "on" : ""} onClick={() => setF((x) => ({ ...x, published: false }))}>Skrit</button>
            </div>

            <div className="adm-field"><label>Naslov</label>
              <input value={f.name} onChange={set("name")} placeholder={P.name} /></div>
            <div className="adm-field"><label>Podnaslov (tip artikla)</label>
              <input value={f.type} onChange={set("type")} placeholder={P.type || "npr. Moško spodnje perilo · BAMBUS · HIP"} /></div>
            <div className="adm-field"><label>Redna prodajna cena z DDV (€)</label>
              <input value={f.price} inputMode="decimal" onChange={(e) => setF((x) => ({ ...x, price: e.target.value.replace(/[^0-9.,]/g, "") }))} placeholder={String(P.price).replace(".", ",")} style={{ maxWidth: 160 }} />
              {P.cost_cents != null && <div className="muted" style={{ marginTop: 6 }}>Nabavna brez DDV: {eur(P.cost_cents)}</div>}</div>
            <div className="adm-field"><label>Opis</label>
              <textarea className="adm-ta" rows={6} value={f.description} onChange={set("description")} placeholder={P.defaultDescription} />
              <div className="muted" style={{ marginTop: 6 }}>Ta opis se pokaže na strani artikla. Če ga izbrišeš, se uporabi privzeti opis.</div></div>
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              <button className="adm-btn pri" onClick={save} disabled={busy}>{busy ? "Shranjujem …" : "💾 Shrani"}</button>
              <span className="muted" style={{ alignSelf: "center" }}>Sprememba je na spletu v nekaj sekundah.</span>
            </div>

            <div className="adm-sec">Slike <span className="muted" style={{ fontWeight: 500, textTransform: "none" }}>· prva je glavna</span></div>
            <div className="adm-imgs">
              {imgs.map((u, i) => (
                <div key={u} className="adm-img">
                  <img src={u} alt="" />
                  {i === 0 && <span className="main">GLAVNA</span>}
                  <div className="ctl">
                    <button onClick={() => move(i, -1)} disabled={busy || i === 0} title="Naprej">◀</button>
                    <button onClick={() => move(i, 1)} disabled={busy || i === imgs.length - 1} title="Nazaj">▶</button>
                    <button onClick={() => confirm("Odstranim to sliko?") && imgAction({ action: "delete", url: u })} disabled={busy} title="Odstrani">✕</button>
                  </div>
                </div>
              ))}
              <label className="adm-img add">
                {busy ? "…" : "+ Dodaj slike"}
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { const fl = [...(e.target.files || [])]; e.target.value = ""; if (fl.length) upload(fl); }} />
              </label>
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

function StockModal({ p, size, onClose, onSaved }) {
  const v = p.sizes[size];
  const [reason, setReason] = useState("prejem");
  const [delta, setDelta] = useState(0);
  const [target, setTarget] = useState(String(v.stock));
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inv = reason === "inventura";
  const after = inv ? Math.max(0, parseInt(target || "0", 10) || 0) : Math.max(0, v.stock + delta);

  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function save() {
    setErr("");
    if (after === v.stock) { onClose(); return; }
    setBusy(true);
    const body = inv ? { sku: v.sku, set: after, reason, note } : { sku: v.sku, delta, reason, note };
    const d = await getJSON("/api/admin/stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!d?.ok) { setErr(d?.message || "Napaka pri shranjevanju."); return; }
    onSaved(`✓ ${p.name} (${size}): zaloga ${v.stock} → ${d.stock}`);
  }

  return (
    <div className="adm-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal">
        <div className="adm-mh">
          <Thumb src={p.img} />
          <div>
            <h3>{p.name} · {size}</h3>
            <div style={{ color: "var(--a-muted)", fontSize: 12.5 }}>{v.sku} · trenutno {v.stock} kos</div>
          </div>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="adm-mb">
          <div className="adm-field">
            <label>Razlog</label>
            <div className="adm-reasons">
              {Object.entries(REASONS).map(([k, l]) => (
                <button key={k} className={reason === k ? "on" : ""} onClick={() => setReason(k)}>{l}</button>
              ))}
            </div>
          </div>
          {inv ? (
            <div className="adm-field">
              <label>Prešteta količina</label>
              <div className="adm-stepper">
                <button onClick={() => setTarget(String(Math.max(0, (parseInt(target || "0", 10) || 0) - 1)))}>−</button>
                <input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))} />
                <button onClick={() => setTarget(String((parseInt(target || "0", 10) || 0) + 1))}>+</button>
              </div>
            </div>
          ) : (
            <div className="adm-field">
              <label>Sprememba</label>
              <div className="adm-stepper">
                <button onClick={() => setDelta((d) => Math.max(-v.stock, d - 1))}>−</button>
                <input inputMode="numeric" value={delta > 0 ? `+${delta}` : String(delta)}
                  onChange={(e) => { const n = parseInt(e.target.value.replace(/[^\d-]/g, ""), 10); setDelta(Number.isFinite(n) ? Math.max(-v.stock, n) : 0); }} />
                <button onClick={() => setDelta((d) => d + 1)}>+</button>
                <button style={{ width: "auto", padding: "0 12px", fontSize: 13 }} onClick={() => setDelta((d) => d + 5)}>+5</button>
              </div>
            </div>
          )}
          <div className="adm-field">
            <label>Opomba (neobvezno)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === "prejem" ? "npr. dobava 1. 10." : ""} />
          </div>
          <div className="adm-preview"><span>Nova zaloga</span><b>{v.stock} → {after}</b></div>
          {err && <div className="adm-note err" style={{ marginTop: 12, marginBottom: 0 }}>{err}</div>}
        </div>
        <div className="adm-mf">
          <button className="adm-btn" onClick={onClose}>Prekliči</button>
          <button className="adm-btn pri" onClick={save} disabled={busy || after === v.stock}>{busy ? "Shranjujem …" : "Shrani"}</button>
        </div>
      </div>
    </div>
  );
}

/* =========================== STRANKE =========================== */
function Customers({ reloadOrders }) {
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState("kupci");
  const [imp, setImp] = useState(null); // { running, label, msg, ok }

  const [loadErr, setLoadErr] = useState("");
  const [openC, setOpenC] = useState(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/customers").catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    setLoadErr(!r || !r.ok || !d?.ok ? (d?.message || (d?.nodb ? "Baza ni povezana." : `Strank ni bilo mogoče naložiti (napaka ${r?.status || "povezave"}).`)) : "");
    setList(d?.customers || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // ---- Uvoz Shopify izvoza (CSV) ----
  async function readSheet(file) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", raw: true, codepage: 65001 });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
  }
  const nk = (k) => String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const pick = (row, ...names) => {
    for (const k of Object.keys(row)) if (names.includes(nk(k))) { const v = row[k]; if (v !== "" && v != null) return v; }
    return "";
  };
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9,.-]/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const yes = (v) => /^(yes|true|da|1|subscribed)$/i.test(String(v).trim());

  async function send(kind, rows, size, onProgress) {
    let done = 0; const tot = { a: 0, b: 0 };
    for (let i = 0; i < rows.length; i += size) {
      const d = await getJSON("/api/admin/import-csv", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, rows: rows.slice(i, i + size) }) });
      if (!d?.ok) throw new Error(d?.message || "Napaka pri uvozu.");
      tot.a += kind === "customers" ? d.customers : d.imported;
      tot.b += kind === "customers" ? d.subscribers : d.skipped;
      done = Math.min(rows.length, i + size);
      onProgress(done, rows.length);
    }
    return tot;
  }

  async function importCustomers(file) {
    if (!file) return;
    try {
      setImp({ running: true, label: "Berem stranke …" });
      const raw = await readSheet(file);
      const rows = raw.map((r) => ({
        email: pick(r, "email"),
        name: [pick(r, "first name"), pick(r, "last name")].filter(Boolean).join(" "),
        phone: String(pick(r, "phone", "default address phone")).replace(/^'/, ""),
        city: pick(r, "default address city", "city"),
        address: [pick(r, "default address address1", "address1"), pick(r, "default address address2", "address2")].filter(Boolean).join(", "),
        zip: String(pick(r, "default address zip", "zip")).replace(/^'/, ""),
        country: pick(r, "default address country code", "country code", "country"),
        orders: num(pick(r, "total orders")),
        spent: num(pick(r, "total spent")),
        marketing: yes(pick(r, "accepts email marketing", "accepts marketing")),
      })).filter((r) => String(r.email).includes("@"));
      if (!rows.length) throw new Error("V datoteki ni stolpca »Email«. Izberi izvoz STRANK (customers_export.csv).");
      const t = await send("customers", rows, 500, (d, n) => setImp({ running: true, label: `Stranke ${d}/${n} …` }));
      setImp({ ok: true, msg: `✓ Uvoženih ${t.a} strank iz Shopifyja (${t.b} novih prijav na novice). Zaloga ni bila spremenjena.` });
    } catch (e) { setImp({ ok: false, msg: String(e.message || e) }); }
    await load();
  }

  async function importOrders(file) {
    if (!file) return;
    try {
      setImp({ running: true, label: "Berem naročila …" });
      const raw = await readSheet(file);
      const byName = new Map();
      for (const r of raw) {
        const name = String(pick(r, "name")).trim();
        if (!/^#?\S+/.test(name) || !name) continue;
        let o = byName.get(name);
        if (!o) { o = { name, rows: [] }; byName.set(name, o); }
        o.rows.push(r);
      }
      const orders = [];
      for (const { name, rows } of byName.values()) {
        const f = rows.find((r) => pick(r, "email")) || rows[0];
        const id = String(pick(f, "id")).trim();
        const items = rows.map((r) => {
          const title = String(pick(r, "lineitem name"));
          const sizeRaw = title.includes(" - ") ? title.slice(title.lastIndexOf(" - ") + 3) : "";
          const size = sizeRaw.split("/")[0].trim().toUpperCase();
          const skuRaw = String(pick(r, "lineitem sku")).trim().toUpperCase();
          const code = skuRaw.split(/[-\s.]/)[0];
          return { name: title.includes(" - ") ? title.slice(0, title.lastIndexOf(" - ")) : title,
            size: size || "-", sku: code ? `${code}-${(size || "").replace(/\s+/g, "")}`.replace(/-$/, "") : "-",
            qty: num(pick(r, "lineitem quantity")), price: num(pick(r, "lineitem price")) };
        }).filter((i) => i.qty > 0);
        const fin = String(pick(f, "financial status")).toLowerCase();
        orders.push({
          ext: id ? `gid://shopify/Order/${id}` : `shopify-csv:${name}`,
          number: String(name).replace(/\D/g, ""),
          email: pick(f, "email"),
          name: pick(f, "shipping name", "billing name"),
          phone: String(pick(f, "shipping phone", "billing phone", "phone")).replace(/^'/, ""),
          address: [pick(f, "shipping address1", "shipping street", "billing address1"), pick(f, "shipping address2")].filter(Boolean).join(", "),
          zip: String(pick(f, "shipping zip", "billing zip")).replace(/^'/, ""),
          city: pick(f, "shipping city", "billing city"),
          country: pick(f, "shipping country", "billing country") || "SI",
          created_at: pick(f, "created at", "paid at"),
          cancelled: !!String(pick(f, "cancelled at")).trim() || fin === "refunded" || fin === "voided",
          subtotal: num(pick(f, "subtotal")), shipping: num(pick(f, "shipping")), total: num(pick(f, "total")),
          items,
        });
      }
      if (!orders.length) throw new Error("V datoteki ni naročil. Izberi izvoz NAROČIL (orders_export.csv).");
      const t = await send("orders", orders, 40, (d, n) => setImp({ running: true, label: `Naročila ${d}/${n} …` }));
      setImp({ ok: true, msg: `✓ Uvoženih ${t.a} naročil iz Shopifyja${t.b ? ` (${t.b} že uvoženih ali brez e-maila preskočenih)` : ""}. Zaloga ni bila spremenjena.` });
      await reloadOrders();
    } catch (e) { setImp({ ok: false, msg: String(e.message || e) }); }
    await load();
  }

  const counts = useMemo(() => ({
    vse: (list || []).length,
    kupci: (list || []).filter((c) => c.orders >= 1).length,
    ret: (list || []).filter((c) => c.orders >= 2).length,
    sub: (list || []).filter((c) => c.subscribed).length,
  }), [list]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list || []).filter((c) =>
      (f === "vse" || (f === "kupci" && c.orders >= 1) || (f === "ret" && c.orders >= 2) || (f === "sub" && c.subscribed)) &&
      (!t || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(t)));
  }, [list, q, f]);

  return (
    <>
      <div className="adm-top">
        <div><h1>Stranke</h1><div className="sub">Nova trgovina + Shopify · ↺ vračajoča = 2 ali več naročil</div></div>
      </div>
      <div className="adm-card adm-step" style={{ marginBottom: 16 }}>
        <div className="n">⇪</div>
        <div className="b">
          <b>Uvoz iz Shopifyja (CSV izvoz)</b>
          <span>Najprej naloži stranke, nato naročila. Uvoz lahko ponoviš brez podvajanja — <b>zaloga se pri tem nikoli ne spremeni</b>.</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label className="adm-btn" style={{ cursor: imp?.running ? "default" : "pointer", opacity: imp?.running ? .5 : 1 }}>
              1 · Naloži stranke (CSV)
              <input type="file" accept=".csv,.xlsx,.xls" disabled={imp?.running} style={{ display: "none" }} onChange={(e) => { importCustomers(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <label className="adm-btn" style={{ cursor: imp?.running ? "default" : "pointer", opacity: imp?.running ? .5 : 1 }}>
              2 · Naloži naročila (CSV)
              <input type="file" accept=".csv,.xlsx,.xls" disabled={imp?.running} style={{ display: "none" }} onChange={(e) => { importOrders(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {imp?.running && <span style={{ alignSelf: "center", fontSize: 13, color: "var(--a-muted)" }}>⏳ {imp.label}</span>}
          </div>
        </div>
      </div>
      {imp && !imp.running && <div className={`adm-note ${imp.ok ? "ok" : "err"}`}>{imp.msg}</div>}
      {loadErr && <div className="adm-note err">⚠️ {loadErr}</div>}
      <div className="adm-bar">
        <div className="adm-chips">
          {[["kupci", "Kupci"], ["ret", "↺ Vračajoče"], ["sub", "Prijavljeni na novice"], ["vse", "Vsi kontakti"]].map(([k, l]) => (
            <button key={k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{l} <span className="c">{counts[k]}</span></button>
          ))}
        </div>
        <div className="adm-search"><input placeholder="Išči: ime, e-mail, kraj …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Stranka</th><th className="r">Naročila</th><th className="r">Skupaj</th><th>Zadnji nakup</th><th>Mailing</th></tr></thead>
          <tbody>
            {list === null ? <tr><td colSpan={5} className="adm-empty">Nalagam …</td></tr> :
             !shown.length ? <tr><td colSpan={5} className="adm-empty">{list.length ? "Ni zadetkov." : "Še ni strank. Nova trgovina še nima naročil — naloži Shopify izvoz strank in naročil z gumboma zgoraj (1 in 2)."}</td></tr> :
             shown.map((c) => (
              <tr key={c.email} className="click" onClick={() => setOpenC(c)}>
                <td>
                  <span className="strong">{c.name}</span>{" "}
                  {c.orders >= 2 && <span className="adm-tag ret">↺ vračajoča</span>}
                  <div className="muted">{c.email}{c.city && c.city !== "-" ? ` · ${c.city}` : ""}</div>
                </td>
                <td className="r num strong">{c.orders}</td>
                <td className="r num strong">{eur(c.total_cents)}</td>
                <td className="muted">{c.last_order ? dShort(c.last_order) : c.orders ? "Shopify" : "—"}</td>
                <td>{c.subscribed ? <span className="adm-tag sub">✓ prijavljen</span> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openC && <CustomerPanel c={openC} onClose={() => setOpenC(null)} />}
    </>
  );
}

/* =========================== INVENTURA =========================== */
const INV_KEY = "inv69-draft";
const today = () => new Date().toLocaleDateString("sl-SI", { day: "numeric", month: "numeric", year: "numeric" });

function Inventory({ stock, reload }) {
  const [grp, setGrp] = useState("all");
  const [onlyStock, setOnlyStock] = useState(true);
  const [q, setQ] = useState("");
  const [counts, setCounts] = useState({});
  const [showSys, setShowSys] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [review, setReview] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  // osnutek preštetih količin ostane shranjen v tem brskalniku
  useEffect(() => {
    try { const d = JSON.parse(localStorage.getItem(INV_KEY) || "{}"); if (d && typeof d === "object") setCounts(d); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(INV_KEY, JSON.stringify(counts)); } catch {}
  }, [counts]);

  const allRows = useMemo(() => {
    const out = [];
    for (const p of stock || []) {
      const gk = groupKey(p);
      for (const size of sortSizes(Object.keys(p.sizes))) {
        const v = p.sizes[size];
        out.push({ sku: v.sku, code: p.code, name: p.name, type: p.type, size, stock: v.stock, img: p.img, gk });
      }
    }
    out.sort((a, b) => GROUP_ORDER.indexOf(a.gk) - GROUP_ORDER.indexOf(b.gk) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
    return out;
  }, [stock]);
  const bySku = useMemo(() => Object.fromEntries(allRows.map((r) => [r.sku, r])), [allRows]);
  const groupsPresent = GROUP_ORDER.filter((g) => allRows.some((r) => r.gk === g));

  const scoped = allRows.filter((r) => (grp === "all" || r.gk === grp) && (!onlyStock || r.stock > 0 || counts[r.sku] !== undefined));
  const t = q.trim().toLowerCase();
  const shown = t ? scoped.filter((r) => `${r.name} ${r.sku} ${r.type || ""}`.toLowerCase().includes(t)) : scoped;

  const entered = Object.entries(counts).filter(([sku, val]) => val !== "" && bySku[sku]);
  const diffs = entered
    .map(([sku, val]) => ({ ...bySku[sku], counted: parseInt(val, 10) }))
    .filter((r) => Number.isFinite(r.counted) && r.counted !== r.stock);
  const doneInScope = scoped.filter((r) => counts[r.sku] !== undefined && counts[r.sku] !== "").length;

  function setCount(sku, val) {
    const clean = val.replace(/\D/g, "").slice(0, 5);
    setCounts((c) => {
      const n = { ...c };
      if (clean === "") delete n[sku]; else n[sku] = clean;
      return n;
    });
  }
  function nextInput(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const inputs = [...document.querySelectorAll("input[data-inv]")];
    const i = inputs.indexOf(e.target);
    inputs[i + 1]?.focus();
  }

  // ---- PDF / tisk popisnega lista ----
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    const id = setTimeout(() => window.print(), 80);
    return () => { clearTimeout(id); window.removeEventListener("afterprint", done); };
  }, [printing]);

  // ---- Excel ----
  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const data = scoped.map((r) => ({
      Skupina: groupName(r.gk), Artikel: r.name, Tip: r.type || "", SKU: r.sku, Velikost: r.size,
      "V sistemu": r.stock, "Prešteto": counts[r.sku] !== undefined ? Number(counts[r.sku]) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 34 }, { wch: 16 }, { wch: 9 }, { wch: 10 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventura");
    XLSX.writeFile(wb, `inventura-69slam-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  async function importXlsx(file) {
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const norm = (k) => String(k).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
      let ok = 0, unknown = 0, skipped = 0;
      const next = { ...counts };
      for (const row of rows) {
        const keys = Object.keys(row);
        const kSku = keys.find((k) => norm(k) === "sku");
        const kCnt = keys.find((k) => ["presteto", "presteta kolicina", "kolicina"].includes(norm(k)));
        if (!kSku || !kCnt) { skipped++; continue; }
        const sku = String(row[kSku]).trim();
        const raw = String(row[kCnt]).trim();
        if (raw === "") continue;
        const n = parseInt(raw, 10);
        if (!Number.isFinite(n) || n < 0) { skipped++; continue; }
        if (!bySku[sku]) { unknown++; continue; }
        next[sku] = String(n); ok++;
      }
      setCounts(next);
      setMsg({ ok: ok > 0, t: ok
        ? `✓ Naloženih ${ok} preštetih količin${unknown ? `, ${unknown} neznanih SKU preskočenih` : ""}. Preglej razlike in potrdi.`
        : "V datoteki ni stolpcev »SKU« in »Prešteto« ali so prazni. Uporabi Excel, ki ga preneseš tukaj." });
    } catch (e) {
      setMsg({ ok: false, t: "Datoteke ni bilo mogoče prebrati. Shrani jo kot .xlsx in poskusi znova." });
    }
  }

  async function confirm() {
    setBusy(true);
    const d = await getJSON("/api/admin/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counts: entered.map(([sku, val]) => ({ sku, counted: Number(val) })), note: `Inventura ${today()}` }),
    });
    setBusy(false);
    setReview(false);
    if (!d?.ok) { setMsg({ ok: false, t: d?.message || "Napaka pri shranjevanju inventure." }); return; }
    setMsg({ ok: true, t: `✓ ${d.message}` });
    setCounts({});
    await reload();
  }

  const printRows = scoped;
  const printGroups = GROUP_ORDER.filter((g) => printRows.some((r) => r.gk === g));

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Inventura</h1>
          <div className="sub">Natisni popisni list, preštej kose, vpiši količine (ali naloži Excel), preveri razlike in potrdi.</div>
        </div>
      </div>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}

      <div className="adm-inv-steps">
        <div className="adm-card adm-step">
          <div className="n">1</div>
          <div className="b">
            <b>Popisni list (PDF)</b>
            <span>Natisni ali shrani kot PDF{grp !== "all" ? ` · samo ${groupName(grp)}` : ""}{onlyStock ? " · samo na zalogi" : ""}.</span>
            <label className="adm-check"><input type="checkbox" checked={showSys} onChange={(e) => setShowSys(e.target.checked)} /> Pokaži stanje v sistemu</label>
            <button className="adm-btn" onClick={() => setPrinting(true)} disabled={!printRows.length}>🖨 Natisni / shrani PDF</button>
          </div>
        </div>
        <div className="adm-card adm-step">
          <div className="n">2</div>
          <div className="b">
            <b>Vpiši preštete kose</b>
            <span>Spodaj v tabelo — ali prenesi Excel, ga izpolni v stolpcu »Prešteto« in naloži nazaj.</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="adm-btn" onClick={exportXlsx} disabled={!scoped.length}>⬇ Prenesi Excel</button>
              <label className="adm-btn" style={{ cursor: "pointer" }}>
                ⬆ Naloži Excel
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { importXlsx(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </div>
          </div>
        </div>
        <div className="adm-card adm-step">
          <div className="n">3</div>
          <div className="b">
            <b>Preglej in potrdi</b>
            <span>{entered.length ? `Vpisanih ${entered.length} količin · ${diffs.length} z razliko.` : "Vpiši vsaj eno količino."} Neizpolnjene ostanejo nespremenjene.</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="adm-btn pri" onClick={() => setReview(true)} disabled={!entered.length}>Preglej razlike →</button>
              {entered.length > 0 && <button className="adm-btn" onClick={() => { if (window.confirm("Izbrišem vse vpisane količine?")) setCounts({}); }}>Počisti</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="adm-bar">
        <div className="adm-chips">
          <button className={grp === "all" ? "on" : ""} onClick={() => setGrp("all")}>Vse</button>
          {groupsPresent.map((g) => (
            <button key={g} className={grp === g ? "on" : ""} onClick={() => setGrp(g)}>{groupName(g)}</button>
          ))}
        </div>
        <label className="adm-check"><input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} /> Samo artikli na zalogi</label>
        <div className="adm-search"><input placeholder="Išči: ime ali SKU …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="adm-progress"><i style={{ width: `${scoped.length ? (doneInScope / scoped.length) * 100 : 0}%` }} /><span>Vpisano {doneInScope} od {scoped.length}</span></div>

      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Artikel</th><th>Vel.</th><th>SKU</th><th className="r">V sistemu</th><th className="r">Prešteto</th><th className="r">Razlika</th></tr></thead>
          <tbody>
            {stock === null ? <tr><td colSpan={6} className="adm-empty">Nalagam …</td></tr> :
             !shown.length ? <tr><td colSpan={6} className="adm-empty">Ni artiklov za ta izbor.</td></tr> :
             shown.map((r, i) => {
              const val = counts[r.sku];
              const has = val !== undefined && val !== "";
              const diff = has ? parseInt(val, 10) - r.stock : 0;
              const head = i === 0 || shown[i - 1].gk !== r.gk;
              return (
                <Fragment key={r.sku}>
                  {head && grp === "all" && <tr className="adm-grp"><td colSpan={6}>{groupName(r.gk)}</td></tr>}
                  <tr className={has ? (diff ? "adm-diff" : "adm-ok") : ""}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Thumb src={r.img} sm />
                        <div><div className="strong">{r.name}</div><div className="muted">{r.type || r.code}</div></div>
                      </div>
                    </td>
                    <td className="strong">{r.size}</td>
                    <td className="muted">{r.sku}</td>
                    <td className="r num">{r.stock}</td>
                    <td className="r">
                      <input className="adm-inv-in" data-inv inputMode="numeric" value={val ?? ""} placeholder="—"
                        onChange={(e) => setCount(r.sku, e.target.value)} onKeyDown={nextInput} />
                    </td>
                    <td className="r num strong" style={{ color: !has ? "#C0C7D2" : diff > 0 ? "var(--a-green)" : diff < 0 ? "var(--a-red)" : "var(--a-muted)" }}>
                      {!has ? "—" : diff > 0 ? `+${diff}` : diff === 0 ? "✓" : diff}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {review && (
        <div className="adm-ov" onClick={(e) => e.target === e.currentTarget && setReview(false)}>
          <div className="adm-modal" style={{ maxWidth: 560 }}>
            <div className="adm-mh">
              <div><h3>Potrdi inventuro</h3><div style={{ color: "var(--a-muted)", fontSize: 12.5 }}>{entered.length} vpisanih · {diffs.length} sprememb · {entered.length - diffs.length} brez razlike</div></div>
              <button className="x" onClick={() => setReview(false)}>✕</button>
            </div>
            <div className="adm-mb" style={{ maxHeight: "55vh", overflowY: "auto" }}>
              {diffs.length ? (
                <div className="adm-items">
                  {diffs.map((r) => (
                    <div className="row" key={r.sku}>
                      <div className="g"><b>{r.name}</b> · {r.size}<div style={{ color: "var(--a-muted)", fontSize: 12 }}>{r.sku}</div></div>
                      <span className="num" style={{ color: "var(--a-muted)" }}>{r.stock} → <b style={{ color: "var(--a-text)" }}>{r.counted}</b></span>
                      <b className="num" style={{ minWidth: 40, textAlign: "right", color: r.counted > r.stock ? "var(--a-green)" : "var(--a-red)" }}>
                        {r.counted > r.stock ? "+" : ""}{r.counted - r.stock}
                      </b>
                    </div>
                  ))}
                </div>
              ) : <div className="adm-note ok" style={{ margin: 0 }}>Vse vpisane količine se ujemajo s sistemom 👌</div>}
              <p style={{ fontSize: 12.5, color: "var(--a-muted)", marginTop: 12 }}>Artikli brez vpisane količine ostanejo nespremenjeni. Vsaka sprememba se zapiše v zgodovino zaloge (razlog: inventura).</p>
            </div>
            <div className="adm-mf">
              <button className="adm-btn" onClick={() => setReview(false)}>Nazaj</button>
              <button className="adm-btn pri" onClick={confirm} disabled={busy}>{busy ? "Shranjujem …" : "Potrdi inventuro"}</button>
            </div>
          </div>
        </div>
      )}

      {printing && (
        <div className="adm-print">
          <div className="pp-head">
            <div><b>69SLAM · Popisni list</b><span>Inventura {today()}{grp !== "all" ? ` · ${groupName(grp)}` : ""}{onlyStock ? " · samo artikli na zalogi" : ""}</span></div>
            <div className="pp-meta">Preštel/-a: ______________________ &nbsp; Podpis: ______________</div>
          </div>
          {printGroups.map((g) => {
            const rows = printRows.filter((r) => r.gk === g);
            return (
              <section key={g} className="pp-sec">
                <h2>{groupName(g)} <small>({rows.length} vrstic · {rows.reduce((a, r) => a + r.stock, 0)} kosov v sistemu)</small></h2>
                <table>
                  <thead><tr><th style={{ width: 28 }}>#</th><th>Artikel</th><th>SKU</th><th style={{ width: 54 }}>Vel.</th>{showSys && <th style={{ width: 62 }}>Sistem</th>}<th style={{ width: 80 }}>Prešteto</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.sku}>
                        <td>{i + 1}</td>
                        <td><b>{r.name}</b>{r.type ? <span className="pp-type"> · {r.type}</span> : null}</td>
                        <td>{r.sku}</td>
                        <td><b>{r.size}</b></td>
                        {showSys && <td className="c">{r.stock}</td>}
                        <td className="box" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/* =========================== PODROBNOSTI STRANKE =========================== */
function CustomerPanel({ c, onClose }) {
  const [d, setD] = useState(null);
  const [openO, setOpenO] = useState(null);
  useEffect(() => {
    getJSON(`/api/admin/customers/detail?email=${encodeURIComponent(c.email)}`).then((x) => setD(x || { ok: false }));
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [c.email, onClose]);

  const orders = d?.orders || [];
  const withAddr = orders.find((o) => o.address && o.address !== "-");
  const shop = d?.shop;
  const phone = orders.find((o) => o.phone)?.phone || shop?.phone || "";
  const addr = withAddr
    ? { line: withAddr.address, city: `${withAddr.zip && withAddr.zip !== "-" ? withAddr.zip + " " : ""}${withAddr.city || ""}`, country: withAddr.country }
    : shop?.address || shop?.city
      ? { line: shop.address || "", city: `${shop.zip ? shop.zip + " " : ""}${shop.city || ""}`, country: shop.country }
      : null;
  const valid = orders.filter((o) => o.status !== "preklicano");
  const firstOrder = valid.length ? valid[valid.length - 1].created_at : null;
  const missing = Math.max(0, (c.orders || 0) - valid.length);

  return (
    <div className="adm-ov side" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-panel">
        <div className="adm-mh">
          <div>
            <h3>{c.name}</h3>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {c.orders >= 2 && <span className="adm-tag ret">↺ vračajoča</span>}
              {(d?.subscribed ?? c.subscribed) ? <span className="adm-tag sub">✓ prijavljena na novice</span> : <span className="adm-tag">ni prijave na novice</span>}
              {c.from_shopify && <span className="adm-tag">Shopify</span>}
            </div>
          </div>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="adm-mb">
          <div className="adm-cstats">
            <div><span>Naročila</span><b>{c.orders}</b></div>
            <div><span>Skupaj</span><b>{eur(c.total_cents)}</b></div>
            <div><span>Povprečno</span><b>{c.orders ? eur(Math.round(c.total_cents / c.orders)) : "—"}</b></div>
          </div>

          <div className="adm-sec">Kontakt</div>
          <dl className="adm-dl">
            <dt>E-mail</dt><dd><a href={`mailto:${c.email}`} style={{ color: "var(--a-blue)" }}>{c.email}</a></dd>
            <dt>Telefon</dt><dd>{phone ? <a href={`tel:${phone.replace(/\s/g, "")}`} style={{ color: "var(--a-blue)" }}>{phone}</a> : <span style={{ color: "var(--a-muted)" }}>ni podatka</span>}</dd>
            <dt>Naslov</dt><dd>{addr ? <>{addr.line}{addr.line && <br />}{addr.city}{addr.country && addr.country !== "SI" ? `, ${addr.country}` : ""}</> : <span style={{ color: "var(--a-muted)" }}>{d ? "ni podatka" : "…"}</span>}</dd>
            {firstOrder && <><dt>Prvi nakup</dt><dd>{dShort(firstOrder)}</dd></>}
            {c.last_order && <><dt>Zadnji nakup</dt><dd>{dShort(c.last_order)}</dd></>}
          </dl>

          <div className="adm-sec">Naročila {orders.length ? `(${orders.length})` : ""}</div>
          {!d ? <div className="adm-empty">Nalagam …</div> : !orders.length ? (
            <div className="adm-note" style={{ margin: 0 }}>Podrobnosti naročil ni v bazi{c.orders ? ` — Shopify za to stranko šteje ${c.orders} naročil. Naloži izvoz naročil (gumb 2), da se pokažejo tukaj.` : "."}</div>
          ) : (
            <div className="adm-items">
              {orders.map((o) => (
                <div key={o.id}>
                  <div className="row" style={{ cursor: "pointer" }} onClick={() => setOpenO(openO === o.id ? null : o.id)}>
                    <div className="g">
                      <b>{onum(o)}</b> <span style={{ color: "var(--a-muted)", fontSize: 12.5 }}>· {dShort(o.created_at)}</span>
                      <div style={{ color: "var(--a-muted)", fontSize: 12.5 }}>{o.items.reduce((a, i) => a + i.qty, 0)} kos · {PAY[o.payment] || o.payment}</div>
                    </div>
                    <Pill s={o.status} />
                    <b className="num" style={{ minWidth: 72, textAlign: "right" }}>{eur(o.total_cents)}</b>
                    <span style={{ color: "var(--a-muted)", width: 14 }}>{openO === o.id ? "▴" : "▾"}</span>
                  </div>
                  {openO === o.id && (
                    <div style={{ background: "#FAFBFC", padding: "6px 12px 10px", borderBottom: "1px solid #EEF1F5", fontSize: 13 }}>
                      {o.items.length ? o.items.map((it, k) => (
                        <div key={k} style={{ display: "flex", gap: 8, padding: "3px 0" }}>
                          <span style={{ flex: 1 }}>{it.qty}× {it.name} <span style={{ color: "var(--a-muted)" }}>· {it.size}</span></span>
                          <span className="num">{eur(it.price_cents)}</span>
                        </div>
                      )) : <span style={{ color: "var(--a-muted)" }}>Ni postavk.</span>}
                      <div style={{ color: "var(--a-muted)", marginTop: 6 }}>Dostava: {o.address}, {o.zip} {o.city}{o.phone ? ` · ${o.phone}` : ""}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {d && orders.length > 0 && missing > 0 && (
            <p style={{ fontSize: 12.5, color: "var(--a-muted)", marginTop: 10 }}>Shopify za to stranko šteje še {missing} starejših naročil, ki jih ni v izvozu.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================== PREVZEMI =========================== */
const VAT = 0.22;
const toNum = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : NaN; };
const eurN = (n) => (Number.isFinite(n) ? n : 0).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function Receipts({ stock, reloadStock }) {
  const [data, setData] = useState(null);
  const [costs, setCosts] = useState({});
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => {
    const [d, c] = await Promise.all([getJSON("/api/admin/receipts"), getJSON("/api/admin/costs")]);
    setData(d || { receipts: [], suppliers: [] });
    setCosts(Object.fromEntries((c?.products || []).map((p) => [p.code, p.cost_cents])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const variants = useMemo(() => {
    const out = [];
    for (const p of stock || []) for (const size of sortSizes(Object.keys(p.sizes)))
      out.push({ sku: p.sizes[size].sku, code: p.code, name: p.name, type: p.type, size, stock: p.sizes[size].stock, img: p.img });
    return out;
  }, [stock]);

  return (
    <>
      <div className="adm-top">
        <div><h1>Prevzemi blaga</h1><div className="sub">Vsak prevzem poveča zalogo in posodobi povprečno nabavno ceno (za RVC).</div></div>
        <div className="grow" />
        <button className="adm-btn pri" onClick={() => setForm({ doc_date: new Date().toISOString().slice(0, 10), supplier: "", doc_ref: "", note: "", lines: [] })}>+ Nov prevzem</button>
      </div>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Številka</th><th>Datum</th><th>Dobavitelj</th><th>Dokument</th><th className="r">Kosov</th><th className="r">Nabavna vrednost</th></tr></thead>
          <tbody>
            {data === null ? <tr><td colSpan={6} className="adm-empty">Nalagam …</td></tr> :
             !data.receipts.length ? <tr><td colSpan={6} className="adm-empty">Še ni prevzemov. Ko dobiš blago, klikni »+ Nov prevzem«.</td></tr> :
             data.receipts.map((rc) => (
              <Fragment key={rc.id}>
                <tr className="click" onClick={() => setOpen(open === rc.id ? null : rc.id)}>
                  <td className="strong">{rc.number}</td>
                  <td className="muted">{dShort(rc.doc_date)}</td>
                  <td>{rc.supplier || "—"}</td>
                  <td className="muted">{rc.doc_ref || "—"}</td>
                  <td className="r num">{rc.items.reduce((a, i) => a + i.qty, 0)}</td>
                  <td className="r num strong">{eur(rc.total_cents)}</td>
                </tr>
                {open === rc.id && (
                  <tr><td colSpan={6} style={{ background: "#FAFBFC" }}>
                    {rc.items.map((i, k) => (
                      <div key={k} style={{ display: "flex", gap: 10, padding: "3px 0", fontSize: 13 }}>
                        <span style={{ flex: 1 }}><b>{i.name}</b> · {i.size} <span className="muted">{i.sku}</span></span>
                        <span className="num">{i.qty} × {eur(i.cost_cents)}</span>
                        <b className="num" style={{ minWidth: 80, textAlign: "right" }}>{eur(i.qty * i.cost_cents)}</b>
                      </div>
                    ))}
                    {rc.note && <div className="muted" style={{ marginTop: 6 }}>Opomba: {rc.note}</div>}
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {form && <ReceiptForm form={form} setForm={setForm} variants={variants} costs={costs} suppliers={data?.suppliers || []}
        onSaved={async (t) => { setForm(null); setMsg({ ok: true, t }); await Promise.all([load(), reloadStock()]); }} />}
    </>
  );
}

function ReceiptForm({ form, setForm, variants, costs, suppliers, onSaved }) {
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const bySku = useMemo(() => Object.fromEntries(variants.map((v) => [v.sku, v])), [variants]);
  const t = q.trim().toLowerCase();
  const hits = t.length < 2 ? [] : variants.filter((v) => `${v.name} ${v.sku} ${v.type || ""}`.toLowerCase().includes(t)).slice(0, 30);

  function add(v) {
    setForm((f) => {
      if (f.lines.some((l) => l.sku === v.sku)) return { ...f, lines: f.lines.map((l) => (l.sku === v.sku ? { ...l, qty: String((parseInt(l.qty, 10) || 0) + 1) } : l)) };
      const c = costs[v.code];
      return { ...f, lines: [...f.lines, { sku: v.sku, qty: "1", cost: c != null ? (c / 100).toFixed(2).replace(".", ",") : "" }] };
    });
  }
  function addAllSizes(code) { variants.filter((v) => v.code === code).forEach(add); }
  function addNewSize(v) {
    const size = (window.prompt(`Nova velikost za ${v.name} (npr. M, XL, 42, 6 LET):`) || "").trim().toUpperCase();
    if (!size) return;
    const sku = `${v.code}-${size.replace(/\s+/g, "")}`;
    if (bySku[sku]) { add(bySku[sku]); return; }
    const c = costs[v.code];
    setForm((f) => f.lines.some((l) => l.sku === sku) ? f : { ...f, lines: [...f.lines, { sku, code: v.code, size, isNew: true, name: v.name, qty: "1",
      cost: c != null ? (c / 100).toFixed(2).replace(".", ",") : "" }] });
  }
  const setLine = (i, k, v) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) }));
  const total = form.lines.reduce((a, l) => a + (parseInt(l.qty, 10) || 0) * (toNum(l.cost) || 0), 0);
  const pieces = form.lines.reduce((a, l) => a + (parseInt(l.qty, 10) || 0), 0);

  async function importXlsx(file) {
    if (!file) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
    const nk = (k) => String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    let ok = 0, bad = 0; const lines = [...form.lines];
    for (const row of rows) {
      const g = (...n) => { for (const k of Object.keys(row)) if (n.includes(nk(k))) return row[k]; return ""; };
      const sku = String(g("sku", "sifra", "koda", "code")).trim().toUpperCase();
      const qty = parseInt(g("kolicina", "kol", "qty", "kos"), 10);
      const cost = String(g("nabavna cena", "nc", "cena", "cost")).trim();
      if (!sku) continue;
      if (!bySku[sku] || !(qty > 0)) { bad++; continue; }
      lines.push({ sku, qty: String(qty), cost }); ok++;
    }
    set("lines", lines);
    setErr(ok ? "" : "V datoteki ni stolpcev SKU + Količina (+ Nabavna cena) ali se SKU-ji ne ujemajo.");
    if (bad) setErr(`Dodanih ${ok} vrstic, ${bad} preskočenih (neznan SKU ali količina 0).`);
  }

  async function save() {
    setErr("");
    const miss = form.lines.find((l) => !(parseInt(l.qty, 10) > 0) || !Number.isFinite(toNum(l.cost)));
    if (!form.lines.length) { setErr("Dodaj vsaj en artikel."); return; }
    if (miss) { setErr(`Pri ${bySku[miss.sku]?.name || miss.name || miss.sku} (${bySku[miss.sku]?.size || miss.size || ""}) manjka količina ali nabavna cena.`); return; }
    setBusy(true);
    const d = await getJSON("/api/admin/receipts", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lines: form.lines.map((l) => ({ sku: l.sku, code: l.code, size: l.size, qty: parseInt(l.qty, 10), cost: toNum(l.cost) })) }) });
    setBusy(false);
    if (!d?.ok) { setErr(d?.message || "Napaka pri shranjevanju."); return; }
    onSaved(`✓ ${d.message}`);
  }

  return (
    <div className="adm-ov side" onClick={(e) => e.target === e.currentTarget && setForm(null)}>
      <div className="adm-panel" style={{ maxWidth: 760, display: "flex", flexDirection: "column" }}>
        <div className="adm-mh"><div><h3>Nov prevzem blaga</h3><div style={{ color: "var(--a-muted)", fontSize: 12.5 }}>Nabavne cene vpiši <b>brez DDV</b>, na kos.</div></div>
          <button className="x" onClick={() => setForm(null)}>✕</button></div>
        <div className="adm-mb" style={{ flex: 1, overflowY: "auto" }}>
          <div className="adm-formgrid">
            <div className="adm-field"><label>Datum prevzema</label><input type="date" value={form.doc_date} onChange={(e) => set("doc_date", e.target.value)} /></div>
            <div className="adm-field"><label>Dobavitelj</label><input list="adm-suppliers" value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="npr. 69SLAM Asia Ltd." />
              <datalist id="adm-suppliers">{suppliers.map((x) => <option key={x} value={x} />)}</datalist></div>
            <div className="adm-field"><label>Št. dobavnice / računa</label><input value={form.doc_ref} onChange={(e) => set("doc_ref", e.target.value)} /></div>
            <div className="adm-field"><label>Opomba</label><input value={form.note} onChange={(e) => set("note", e.target.value)} /></div>
          </div>

          <div className="adm-sec" style={{ marginTop: 4 }}>Dodaj artikle</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div className="adm-search" style={{ marginLeft: 0, flex: 1 }}><input style={{ width: "100%" }} placeholder="Išči artikel ali SKU (vsaj 2 črki) …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <label className="adm-btn" style={{ cursor: "pointer" }}>⬆ Vrstice iz Excela
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { importXlsx(e.target.files?.[0]); e.target.value = ""; }} /></label>
          </div>
          {hits.length > 0 && (
            <div className="adm-hits">
              {hits.map((v) => (
                <div key={v.sku} className="adm-hit">
                  <Thumb src={v.img} sm />
                  <div style={{ flex: 1, minWidth: 0 }}><b>{v.name}</b> · {v.size}<div className="muted" style={{ fontSize: 12 }}>{v.sku}{v.type ? ` · ${v.type}` : ""} · zaloga {v.stock}</div></div>
                  <button className="adm-btn" onClick={() => add(v)}>+ {v.size}</button>
                  <button className="adm-btn" title="Dodaj vse velikosti tega artikla" onClick={() => addAllSizes(v.code)}>+ vse vel.</button>
                  <button className="adm-btn" title="Velikost, ki je še ni v sistemu" onClick={() => addNewSize(v)}>+ nova vel.</button>
                </div>
              ))}
            </div>
          )}

          <div className="adm-sec">Vrstice ({form.lines.length})</div>
          {!form.lines.length ? <div className="adm-empty" style={{ padding: 18 }}>Poišči artikel zgoraj ali naloži Excel (stolpci: SKU, Količina, Nabavna cena).</div> : (
            <table className="adm-tbl">
              <thead><tr><th>Artikel</th><th className="r">Količina</th><th className="r">Nabavna cena/kos</th><th className="r">Skupaj</th><th /></tr></thead>
              <tbody>
                {form.lines.map((l, i) => {
                  const v = bySku[l.sku] || { name: l.name, size: l.size };
                  return (
                    <tr key={l.sku}>
                      <td><b>{v?.name}</b> · {v?.size}{l.isNew && <span className="adm-tag" style={{ marginLeft: 6 }}>nova velikost</span>}<div className="muted">{l.sku}</div></td>
                      <td className="r"><input className="adm-inv-in" inputMode="numeric" value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value.replace(/\D/g, ""))} /></td>
                      <td className="r"><input className="adm-inv-in" style={{ width: 90 }} inputMode="decimal" placeholder="0,00" value={l.cost} onChange={(e) => setLine(i, "cost", e.target.value.replace(/[^0-9.,]/g, ""))} /></td>
                      <td className="r num strong">{eurN((parseInt(l.qty, 10) || 0) * (toNum(l.cost) || 0))}</td>
                      <td className="r"><button className="adm-btn" onClick={() => set("lines", form.lines.filter((_, j) => j !== i))}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {err && <div className="adm-note err" style={{ marginTop: 12, marginBottom: 0 }}>{err}</div>}
        </div>
        <div className="adm-mf" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13.5 }}>{pieces} kosov · nabavna vrednost <b>{eurN(total)}</b> <span className="muted">(z DDV {eurN(total * (1 + VAT))})</span></span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="adm-btn" onClick={() => setForm(null)}>Prekliči</button>
            <button className="adm-btn pri" onClick={save} disabled={busy}>{busy ? "Shranjujem …" : "Shrani prevzem"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================== CENIK & RVC =========================== */
/* ---------- Čisti RVC od prodaje ---------- */
const GRP_RVC = { boksarice: "Moške boksarice", kopalke: "Moške kopalke", oblacila: "Moška oblačila", obutev: "Obutev", dodatki: "Dodatki", zenske: "Ženske", otroci: "Otroci", embalaza: "Embalaža", drugo: "Drugo", neznano: "Neznano (stari SKU)" };
const MON = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
function SalesRvc() {
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const now = new Date();
  const PER = [
    { id: "m", lbl: "Ta mesec", f: () => [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)] },
    { id: "pm", lbl: "Prejšnji mesec", f: () => [iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), iso(new Date(now.getFullYear(), now.getMonth(), 0))] },
    { id: "y", lbl: "Letos", f: () => [`${now.getFullYear()}-01-01`, iso(now)] },
    { id: "ly", lbl: "Lani", f: () => [`${now.getFullYear() - 1}-01-01`, `${now.getFullYear() - 1}-12-31`] },
    { id: "12", lbl: "Zadnjih 12 mesecev", f: () => [iso(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate() + 1)), iso(now)] },
    { id: "all", lbl: "Vse", f: () => ["2000-01-01", iso(now)] },
  ];
  const [per, setPer] = useState("y");
  const [range, setRange] = useState(PER[2].f());
  const [d, setD] = useState(null);
  useEffect(() => {
    let live = true; setD(null);
    getJSON(`/api/admin/rvc?from=${range[0]}&to=${range[1]}`).then((x) => live && setD(x || { ok: false }));
    return () => { live = false; };
  }, [range]);
  const pick = (p) => { setPer(p.id); setRange(p.f()); };
  const t = d?.total;
  const pct = (x) => (x.net - (x.missNet || 0) > 0 ? `${Math.round((x.rvc / (x.net - (x.missNet || 0))) * 100)} %` : "—");
  const ymL = (ym) => { const [y, m] = ym.split("-"); return `${MON[+m - 1]} ${y}`; };
  async function exportXlsx() {
    if (!d?.ok) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const row = (x) => ({ "Kosov": x.qty, "Prodaja z DDV": x.gross / 100, "Prodaja brez DDV": x.net / 100, "Nabavna": x.cost / 100, "Čisti RVC": x.rvc / 100 });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.months.map((m) => ({ Mesec: ymL(m.ym), "Naročila": m.orders, ...row(m) }))), "Po mesecih");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.groups.map((g) => ({ Skupina: GRP_RVC[g.g] || g.g, ...row(g) }))), "Po skupinah");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d.articles.map((a) => ({ "Šifra": a.code, Artikel: a.name, ...row(a) }))), "Artikli");
    XLSX.writeFile(wb, `rvc-prodaja-${range[0]}-${range[1]}.xlsx`);
  }
  return (
    <>
      <div className="adm-bar">
        <div className="adm-chips">{PER.map((p) => <button key={p.id} className={per === p.id ? "on" : ""} onClick={() => pick(p)}>{p.lbl}</button>)}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" className="adm-inv-in" style={{ width: 150 }} value={range[0]} onChange={(e) => { setPer("c"); setRange([e.target.value, range[1]]); }} />
          <span className="muted">–</span>
          <input type="date" className="adm-inv-in" style={{ width: 150 }} value={range[1]} onChange={(e) => { setPer("c"); setRange([range[0], e.target.value]); }} />
          <button className="adm-btn" onClick={exportXlsx} disabled={!d?.ok}>⬇ Excel</button>
        </div>
      </div>
      {d && !d.ok && <div className="adm-note err">{d.message || "Napaka pri nalaganju."}</div>}
      <div className="adm-stats">
        <div className="adm-card adm-stat"><div className="k">Prodaja brez DDV</div><div className="v">{t ? eur(t.net) : "…"}</div><div className="d">{t ? `${t.orders} naročil · ${t.qty} kosov · z DDV ${eur(t.gross)}` : " "}</div></div>
        <div className="adm-card adm-stat"><div className="k">Nabavna vrednost prodanega</div><div className="v">{t ? eur(t.cost) : "…"}</div><div className="d">brez DDV</div></div>
        <div className="adm-card adm-stat"><div className="k">Čisti RVC</div><div className="v" style={{ color: "var(--a-green)" }}>{t ? eur(t.rvc) : "…"}</div><div className="d">prodaja brez DDV − nabavna</div></div>
        <div className="adm-card adm-stat"><div className="k">Marža</div><div className="v">{t ? pct(t) : "…"}</div><div className="d">{t ? (t.missQty ? `${t.missQty} kosov brez nabavne cene ni šteto` : t.estQty ? `${t.estQty} kosov z oceno nabavne (povprečje skupine)` : "vsi prodani kosi imajo nabavno") : " "}</div></div>
      </div>
      <div className="adm-note" style={{ marginBottom: 12 }}>Upoštevane so dejanske prodajne cene (s popusti in kodami), brez poštnine{t ? ` (poštnina v obdobju: ${eur(t.shipping)})` : ""}. Preklicana naročila niso šteta. Pri starih naročilih iz Shopifyja je uporabljena današnja nabavna cena (za artikle, ki jih ni več, nabavna iz cenikov Metakocke).</div>
      <div className="adm-grid2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, marginBottom: 16 }}>
        <div className="adm-card adm-scroll">
          <table className="adm-tbl">
            <thead><tr><th>Mesec</th><th className="r">Naročila</th><th className="r">Prodaja brez DDV</th><th className="r">Čisti RVC</th><th className="r">Marža</th></tr></thead>
            <tbody>{!d ? <tr><td colSpan={5} className="adm-empty">Nalagam …</td></tr> : !d.months?.length ? <tr><td colSpan={5} className="adm-empty">V obdobju ni prodaje.</td></tr> :
              d.months.map((m) => <tr key={m.ym}><td className="strong">{ymL(m.ym)}</td><td className="r num">{m.orders}</td><td className="r num">{eur(m.net)}</td><td className="r num strong" style={{ color: "var(--a-green)" }}>{eur(m.rvc)}</td><td className="r num">{pct(m)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="adm-card adm-scroll">
          <table className="adm-tbl">
            <thead><tr><th>Skupina</th><th className="r">Kosov</th><th className="r">Prodaja brez DDV</th><th className="r">Čisti RVC</th><th className="r">Marža</th></tr></thead>
            <tbody>{(d?.groups || []).map((g) => <tr key={g.g}><td className="strong">{GRP_RVC[g.g] || g.g}</td><td className="r num">{g.qty}</td><td className="r num">{eur(g.net)}</td><td className="r num strong" style={{ color: "var(--a-green)" }}>{eur(g.rvc)}</td><td className="r num">{pct(g)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Artikel (top 50 po RVC)</th><th className="r">Kosov</th><th className="r">Prodaja brez DDV</th><th className="r">Nabavna</th><th className="r">Čisti RVC</th><th className="r">Marža</th></tr></thead>
          <tbody>{(d?.articles || []).map((a) => <tr key={a.code}><td><div className="strong">{a.name}</div><div className="muted">{a.code}</div></td><td className="r num">{a.qty}</td><td className="r num">{eur(a.net)}</td><td className="r num muted">{a.missQty ? "—" : eur(a.cost)}</td><td className="r num strong" style={{ color: "var(--a-green)" }}>{a.missQty === a.qty ? "—" : eur(a.rvc)}</td><td className="r num">{a.missQty === a.qty ? "—" : pct(a)}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function PriceList() {
  const [tab, setTab] = useState("zaloga");
  const [list, setList] = useState(null);
  const [f, setF] = useState("all");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(null);
  const [edit, setEdit] = useState({});
  const load = useCallback(async () => { const d = await getJSON("/api/admin/costs"); setList(d?.products || []); }, []);
  useEffect(() => { load(); }, [load]);

  async function saveCosts(items) {
    const d = await getJSON("/api/admin/costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    setMsg({ ok: !!d?.ok, t: d?.message || "Napaka pri shranjevanju." });
    await load();
  }
  async function commit(code) {
    const v = edit[code];
    if (v === undefined) return;
    setEdit((e) => { const n = { ...e }; delete n[code]; return n; });
    const n = toNum(v);
    if (!Number.isFinite(n)) return;
    const cur = (list || []).find((p) => p.code === code)?.cost_cents;
    if (cur != null && Math.round(n * 100) === cur) return;
    await saveCosts([{ key: code, cost: n }]);
  }
  async function exportXlsx() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet((list || []).map((p) => ({ "Šifra": p.code, Artikel: p.name, Tip: p.type || "", Zaloga: p.stock,
      "Prodajna cena z DDV": p.price_cents / 100, "Nabavna cena brez DDV": p.cost_cents != null ? p.cost_cents / 100 : "" })));
    ws["!cols"] = [{ wch: 12 }, { wch: 26 }, { wch: 34 }, { wch: 8 }, { wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Cenik");
    XLSX.writeFile(wb, `cenik-69slam-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  async function importXlsx(file) {
    if (!file) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
    const nk = (k) => String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const items = [];
    for (const row of rows) {
      const g = (...n) => { for (const k of Object.keys(row)) if (n.some((x) => nk(k) === x || nk(k).startsWith(x + " "))) return row[k]; return ""; };
      const key = String(g("sifra", "sku", "koda", "code", "sifra artikla")).trim();
      const cost = String(g("nabavna cena", "nc", "nabavna", "cost")).trim();
      if (key && cost !== "" && Number.isFinite(toNum(cost))) items.push({ key, cost: toNum(cost) });
    }
    if (!items.length) { setMsg({ ok: false, t: "V datoteki ni stolpcev »Šifra« (ali SKU) in »Nabavna cena«." }); return; }
    await saveCosts(items);
  }

  const FILT = [
    { id: "all", lbl: "Vse", fn: () => true },
    { id: "nocost", lbl: "Brez nabavne cene", fn: (p) => p.cost_cents == null },
    { id: "boks", lbl: "Boksarice", fn: (p) => p.gender === "moski" && p.group === "boksarice" },
    { id: "kop", lbl: "Kopalke", fn: (p) => p.gender === "moski" && p.group === "kopalke" },
    { id: "ost", lbl: "Ostalo moško", fn: (p) => p.gender === "moski" && !["boksarice", "kopalke"].includes(p.group) },
    { id: "out", lbl: "Ženske & otroci", fn: (p) => p.gender !== "moski" },
  ];
  const t = q.trim().toLowerCase();
  const shown = (list || []).filter((p) => FILT.find((x) => x.id === f).fn(p) && (!t || `${p.name} ${p.code} ${p.type || ""}`.toLowerCase().includes(t)));
  const sum = (list || []).reduce((a, p) => ({ cost: a.cost + (p.cost_cents || 0) * Math.max(0, p.stock), sale: a.sale + p.price_cents * Math.max(0, p.stock), miss: a.miss + (p.cost_cents == null && p.stock > 0 ? 1 : 0) }), { cost: 0, sale: 0, miss: 0 });

  return (
    <>
      <div className="adm-top">
        <div><h1>Cenik & RVC</h1><div className="sub">Nabavne cene so <b>brez DDV</b>. RVC = prodajna cena brez DDV − nabavna cena. Klikni ceno, da jo spremeniš.</div></div>
        <div className="grow" />
        <button className="adm-btn" onClick={exportXlsx} disabled={!list?.length}>⬇ Excel</button>
        <label className="adm-btn" style={{ cursor: "pointer" }}>⬆ Uvozi nabavne cene
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { importXlsx(e.target.files?.[0]); e.target.value = ""; }} /></label>
      </div>
      <div className="adm-chips" style={{ marginBottom: 14 }}>
        <button className={tab === "zaloga" ? "on" : ""} onClick={() => setTab("zaloga")}>Cenik & RVC na zalogi</button>
        <button className={tab === "prodaja" ? "on" : ""} onClick={() => setTab("prodaja")}>Čisti RVC od prodaje</button>
      </div>
      {tab === "prodaja" ? <SalesRvc /> : <>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div className="adm-stats" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        <div className="adm-card adm-stat"><div className="k">Vrednost zaloge (nabavna, brez DDV)</div><div className="v">{eur(sum.cost)}</div><div className="d">{sum.miss ? `${sum.miss} artiklov na zalogi brez nabavne cene` : "vsi artikli imajo nabavno ceno"}</div></div>
        <div className="adm-card adm-stat"><div className="k">Vrednost zaloge (prodajna, z DDV)</div><div className="v">{eur(sum.sale)}</div><div className="d">po rednih cenah</div></div>
        <div className="adm-card adm-stat"><div className="k">Možna RVC na zalogi</div><div className="v">{eur(Math.round(sum.sale / (1 + VAT)) - sum.cost)}</div><div className="d">prodajna brez DDV − nabavna</div></div>
      </div>
      <div className="adm-bar">
        <div className="adm-chips">{FILT.map((x) => <button key={x.id} className={f === x.id ? "on" : ""} onClick={() => setF(x.id)}>{x.lbl} <span className="c">{(list || []).filter(x.fn).length}</span></button>)}</div>
        <div className="adm-search"><input placeholder="Išči: ime ali šifra …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Artikel</th><th className="r">Zaloga</th><th className="r">Prodajna z DDV</th><th className="r">Prodajna brez DDV</th><th className="r">Nabavna brez DDV</th><th className="r">RVC / kos</th><th className="r">Marža</th></tr></thead>
          <tbody>
            {list === null ? <tr><td colSpan={7} className="adm-empty">Nalagam …</td></tr> :
             !shown.length ? <tr><td colSpan={7} className="adm-empty">Ni zadetkov.</td></tr> :
             shown.map((p) => {
              const net = p.price_cents / (1 + VAT);
              const rvc = p.cost_cents != null ? net - p.cost_cents : null;
              const val = edit[p.code] ?? (p.cost_cents != null ? (p.cost_cents / 100).toFixed(2).replace(".", ",") : "");
              return (
                <tr key={p.code}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Thumb src={p.img} sm /><div><div className="strong">{p.name}</div><div className="muted">{p.code}{p.type ? ` · ${p.type}` : ""}</div></div></div></td>
                  <td className="r num">{p.stock}</td>
                  <td className="r num">{eur(p.price_cents)}</td>
                  <td className="r num muted">{eur(Math.round(net))}</td>
                  <td className="r"><input className="adm-inv-in" style={{ width: 92, borderColor: p.cost_cents == null ? "#F5C26B" : undefined }} inputMode="decimal" placeholder="—"
                    value={val} onChange={(e) => setEdit((x) => ({ ...x, [p.code]: e.target.value.replace(/[^0-9.,]/g, "") }))}
                    onBlur={() => commit(p.code)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} /></td>
                  <td className="r num strong" style={{ color: rvc == null ? "#C0C7D2" : rvc < 0 ? "var(--a-red)" : "var(--a-green)" }}>{rvc == null ? "—" : eur(Math.round(rvc))}</td>
                  <td className="r num">{rvc == null ? "—" : `${Math.round((rvc / net) * 100)} %`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>}
    </>
  );
}

/* =========================== E-MAILI =========================== */
const CSTATUS = { osnutek: "Osnutek", "načrtovano": "📅 Načrtovano", "v pošiljanju": "Se pošilja", poslano: "Poslano" };
const JOBKIND = { review: "⭐ Prošnja za oceno", cart1: "🛒 Košarica – 1. opomnik", cart2: "🛒 Košarica – 2. opomnik" };
const JOBST = { cakajoce: "Čaka", "v teku": "V teku", poslano: "Poslano", "preskočeno": "Preskočeno", preklicano: "Preklicano", napaka: "Napaka" };
const post = (url, body) => getJSON(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

function Mailing({ stock }) {
  const [tab, setTab] = useState("kampanje");
  return (
    <>
      <div className="adm-top">
        <div><h1>E-maili</h1><div className="sub">Kampanje (novice), samodejni maili in naročniki. Potrditve naročil in »poslano« gredo samodejno.</div></div>
        <div className="grow" />
        <div className="adm-seg">
          {[["kampanje", "Kampanje"], ["samodejni", "Samodejni maili"], ["narocniki", "Naročniki"]].map(([k, l]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      {tab === "kampanje" && <Campaigns stock={stock} />}
      {tab === "samodejni" && <AutoMails />}
      {tab === "narocniki" && <Subscribers />}
    </>
  );
}

function Campaigns({ stock }) {
  const [list, setList] = useState(null);
  const [subs, setSubs] = useState(0);
  const [ed, setEd] = useState(null);
  const [msg, setMsg] = useState(null);
  const [st, setSt] = useState(null); // analiza izbrane kampanje
  const load = useCallback(async () => { const d = await getJSON("/api/admin/campaigns"); setList(d?.campaigns || []); setSubs(d?.subscribers || 0); }, []);
  useEffect(() => { load(); }, [load]);
  const blank = () => ({ subject: "", preheader: "", title: "", lang: "sl", blocks: [
    { type: "image", url: "", link: "" }, { type: "text", text: "" }, { type: "products", codes: [] }, { type: "button", text: "Poglej v trgovini", url: "https://69slam.si" }] });
  async function act(c, action) {
    if (action === "delete" && !confirm(`Izbrišem osnutek »${c.subject || "brez zadeve"}«?`)) return;
    if (action === "delete") await getJSON(`/api/admin/campaigns?id=${c.id}`, { method: "DELETE" });
    if (action === "copy") { const d = await post("/api/admin/campaigns", { id: c.id, action: "copy" }); setMsg({ ok: true, t: "Kopija narejena — najdeš jo na vrhu seznama." }); void d; }
    if (action === "send") {
      if (!confirm(`Nadaljujem pošiljanje kampanje »${c.subject}« (še ${c.left})?`)) return;
      setMsg({ ok: true, t: "Pošiljam …" });
      const d = await post("/api/admin/campaigns", { id: c.id, action: "send" });
      setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." });
    }
    load();
  }
  async function openStats(c) {
    setSt({ c, d: null });
    const d = await getJSON(`/api/admin/campaigns?id=${c.id}&stats=1`);
    setSt({ c, d });
  }
  const pct = (n, of) => (of ? ` (${Math.round((n / of) * 100)} %)` : "");
  if (ed) return <CampaignEditor init={ed} stock={stock} subs={subs} onClose={() => { setEd(null); load(); }} />;
  return (
    <>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <button className="adm-btn pri" onClick={() => setEd(blank())}>+ Nova kampanja</button>
        <button className="adm-btn" onClick={() => setEd({ ...blank(), blocks: [], html: "" })}>{"</>"} Nova iz HTML kode</button>
        <span className="muted">Aktivnih naročnikov: <b>{subs}</b></span>
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Zadeva</th><th>Stanje</th><th className="r">Poslano</th><th className="r">Odprlo</th><th className="r">Kliknilo</th><th className="r">Naročila</th><th>Datum</th><th></th></tr></thead>
          <tbody>
            {list === null ? <tr><td colSpan={5} className="adm-empty">Nalagam …</td></tr> :
             !list.length ? <tr><td colSpan={8} className="adm-empty">Še ni kampanj — klikni »+ Nova kampanja«.</td></tr> :
             list.map((c) => (
              <tr key={c.id}>
                <td><div className="strong">{c.subject || "(brez zadeve)"}</div>{c.preheader && <div className="muted">{c.preheader}</div>}{c.error && <div style={{ color: "#c0392b", fontSize: 12 }}>⚠️ {c.error}</div>}</td>
                <td><span className={`adm-tag ${c.status === "poslano" ? "sub" : ""}`}>{CSTATUS[c.status] || c.status}</span>{c.left ? <div className="muted">še {c.left}</div> : null}</td>
                <td className="r num">{c.sent_count || "—"}</td>
                <td className="r num">{c.stats && c.tracked === false ? <span className="muted" title="Poslano pred uvedbo merjenja">ni merjeno</span> : c.stats ? <>{c.stats.opens}<div className="muted">{pct(c.stats.opens, c.sent_count).trim()}</div></> : "—"}</td>
                <td className="r num">{c.stats && c.tracked === false ? <span className="muted">—</span> : c.stats ? <>{c.stats.clicks}<div className="muted">{pct(c.stats.clicks, c.sent_count).trim()}</div></> : "—"}</td>
                <td className="r num">{c.stats ? <>{c.stats.orders}{c.stats.revenue_cents ? <div className="muted">{(c.stats.revenue_cents / 100).toLocaleString("sl-SI", { style: "currency", currency: "EUR" })}</div> : null}</> : "—"}</td>
                <td className="muted">{c.status === "načrtovano" && c.scheduled_at ? <b style={{ color: "#0a0a0a" }}>{new Date(c.scheduled_at).toLocaleString("sl-SI", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</b> : dShort(c.sent_at || c.updated_at)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {(c.status === "osnutek" || c.status === "načrtovano") && <><button className="adm-btn" onClick={() => setEd(c)}>Uredi</button>{" "}</>}
                  {c.status === "v pošiljanju" && <><button className="adm-btn pri" onClick={() => act(c, "send")}>Nadaljuj</button>{" "}</>}
                  {c.stats && <><button className="adm-btn" onClick={() => openStats(c)}>📊 Analiza</button>{" "}</>}
                  <a className="adm-btn" href={`/api/admin/campaigns?id=${c.id}&preview=1`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>👁</a>{" "}
                  <button className="adm-btn" onClick={() => act(c, "copy")}>Kopiraj</button>{" "}
                  {(c.status === "osnutek" || c.status === "načrtovano") && <button className="adm-btn" onClick={() => act(c, "delete")}>✕</button>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {st && (
        <div className="adm-card" style={{ padding: 18, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0 }}>📊 {st.c.subject}</h3>
            <button className="adm-btn" onClick={() => setSt(null)}>Zapri</button>
          </div>
          {st.c.stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, margin: "14px 0" }}>
              {[["📨 Poslano", st.c.sent_count], ["👀 Odprlo", `${st.c.stats.opens}${pct(st.c.stats.opens, st.c.sent_count)}`],
                ["👆 Kliknilo", `${st.c.stats.clicks}${pct(st.c.stats.clicks, st.c.sent_count)}`],
                ["🛒 Naročila", `${st.c.stats.orders} · ${(st.c.stats.revenue_cents / 100).toLocaleString("sl-SI", { style: "currency", currency: "EUR" })}`],
                ["🚫 Odjave", st.c.stats.unsubs]].map(([k, v]) => (
                <div key={k} className="adm-card adm-stat" style={{ padding: 12 }}><div className="k">{k}</div><div className="v" style={{ fontSize: 20 }}>{v}</div></div>
              ))}
            </div>
          )}
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Odprtja so približna (iPhone Mail samodejno »odpre« vse maile). Kliki in naročila so natančni. Naročilo šteje, če je kupec v 7 dneh prišel iz maila.</div>
          {!st.d ? <div className="muted">Nalagam …</div> : (
            <>
              <h4>Kdo je kliknil ({st.d.clicks.length})</h4>
              {!st.d.clicks.length ? <div className="muted">Še nihče.</div> : (
                <div className="adm-scroll"><table className="adm-tbl"><thead><tr><th>E-mail</th><th className="r">Klikov</th><th>Zadnji klik</th></tr></thead>
                  <tbody>{st.d.clicks.map((r) => <tr key={r.email}><td>{r.email}</td><td className="r num">{r.n}</td><td className="muted">{new Date(r.last).toLocaleString("sl-SI")}</td></tr>)}</tbody></table></div>
              )}
              <h4>Najbolj klikane povezave</h4>
              {!st.d.links.length ? <div className="muted">Še ni klikov.</div> : (
                <table className="adm-tbl"><tbody>{st.d.links.map((r) => <tr key={r.url}><td style={{ wordBreak: "break-all" }}>{r.url.replace(/^https?:\/\//, "").replace(/\?utm_[^#]*/, "")}</td><td className="r num">{r.n}</td></tr>)}</tbody></table>
              )}
              <h4>Naročila iz maila ({st.d.orders.length})</h4>
              {!st.d.orders.length ? <div className="muted">Še ni naročil.</div> : (
                <table className="adm-tbl"><tbody>{st.d.orders.map((o) => <tr key={o.id}><td>#{o.number}</td><td>{o.name}</td><td className="muted">{o.email}</td><td className="r num">{(o.total_cents / 100).toLocaleString("sl-SI", { style: "currency", currency: "EUR" })}</td></tr>)}</tbody></table>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

function CampaignEditor({ init, stock, subs, onClose }) {
  const [c, setC] = useState(init);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("69slamslovenia@gmail.com");
  const [pv, setPv] = useState(0);
  const [mode, setMode] = useState(typeof init.html === "string" ? "html" : "blocks");
  const toLocal = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const [when, setWhen] = useState(init.scheduled_at ? toLocal(init.scheduled_at) : toLocal(Date.now() + 3600 * 1000));
  const set = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }));
  const setB = (i, patch) => setC((x) => ({ ...x, blocks: x.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const move = (i, d) => setC((x) => { const b = [...x.blocks]; const j = i + d; if (j < 0 || j >= b.length) return x; [b[i], b[j]] = [b[j], b[i]]; return { ...x, blocks: b }; });
  const del = (i) => setC((x) => ({ ...x, blocks: x.blocks.filter((_, j) => j !== i) }));
  const add = (type) => setC((x) => ({ ...x, blocks: [...x.blocks, type === "products" ? { type, codes: [] } : type === "button" ? { type, text: "Poglej", url: "https://69slam.si" } : type === "image" ? { type, url: "", link: "" } : { type, text: "" }] }));
  async function save(action) {
    setBusy(true); setMsg(null);
    const d = await post("/api/admin/campaigns", { id: c.id, subject: c.subject, preheader: c.preheader, title: c.title, lang: c.lang,
      blocks: mode === "html" ? [] : c.blocks, html: mode === "html" ? (c.html || "") : null, action, to: testTo,
      at: action === "schedule" ? new Date(when).toISOString() : undefined });
    setBusy(false);
    if (d?.id) setC((x) => ({ ...x, id: d.id, ...(action === "schedule" && d?.ok ? { status: "načrtovano", scheduled_at: new Date(when).toISOString() } : {}), ...(action === "unschedule" ? { status: "osnutek", scheduled_at: null } : {}) }));
    setPv((n) => n + 1);
    setMsg({ ok: !!d?.ok, t: d?.message || (d?.ok ? "Shranjeno ✓" : "Napaka pri shranjevanju.") });
    return d;
  }
  async function sendAll() {
    if (!c.subject.trim()) { setMsg({ ok: false, t: "Vpiši zadevo maila." }); return; }
    if (!confirm(`Pošljem kampanjo »${c.subject}« vsem aktivnim naročnikom (${subs})?\n\nTega ni mogoče preklicati.`)) return;
    setMsg({ ok: true, t: "Pošiljam … (lahko traja do 1 minute)" });
    const d = await save("send");
    if (d?.ok) setTimeout(onClose, 1500);
  }
  async function upload(i, file) {
    if (!file) return;
    setB(i, { uploading: true });
    const d = await getJSON("/api/admin/campaigns?action=upload", { method: "POST", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
    setB(i, { uploading: false, ...(d?.ok ? { url: d.url } : {}) });
    if (!d?.ok) setMsg({ ok: false, t: d?.message || "Slike ni bilo mogoče naložiti." });
  }
  const LBL = { heading: "Naslov", text: "Besedilo", image: "Slika", products: "Artikli", button: "Gumb" };
  return (
    <div className="mail-ed">
      <div className="mail-ed-form">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button className="adm-btn" onClick={onClose}>← Nazaj</button>
          <div className="grow" />
          <button className="adm-btn" disabled={busy} onClick={() => save()}>💾 Shrani</button>
        </div>
        {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
        <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="adm-field"><label>Zadeva maila (subject)</label><input value={c.subject} onChange={set("subject")} placeholder="npr. 🔥 Novi dizajni so tu!" /></div>
          <div className="adm-field"><label>Predogled v inboxu (neobvezno)</label><input value={c.preheader || ""} onChange={set("preheader")} placeholder="Kratek stavek, ki se vidi ob zadevi" /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="adm-field" style={{ flex: 1 }}><label>Velik naslov v mailu</label><input value={c.title || ""} onChange={set("title")} placeholder="npr. NOVA KOLEKCIJA" /></div>
            <div className="adm-field"><label>Jezik</label><select value={c.lang || "sl"} onChange={set("lang")}><option value="sl">SL</option><option value="en">EN</option></select></div>
          </div>
        </div>
        <div className="adm-seg" style={{ marginBottom: 12 }}>
          <button className={mode === "blocks" ? "on" : ""} onClick={() => setMode("blocks")}>🧱 Sestavi z bloki</button>
          <button className={mode === "html" ? "on" : ""} onClick={() => setMode("html")}>{"</>"} Prilepi HTML kodo</button>
        </div>
        {mode === "html" && (
          <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="adm-field">
              <label>HTML koda maila (prilepi celotno kodo, ki ti jo da Claude)</label>
              <textarea rows={16} value={c.html || ""} onChange={set("html")} spellCheck={false}
                style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, lineHeight: 1.45 }} placeholder={"<!doctype html>\n<html>…</html>"} />
            </div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              Povezava za odjavo: kjer v kodi piše <b>{"{{odjava}}"}</b>, se vstavi osebna povezava za odjavo. Če je ni, jo dodam samodejno na dno maila.
              Zadevo in predogled v inboxu vpiši zgoraj. Klikni »Shrani« za predogled na desni.
            </div>
          </div>
        )}
        {mode === "blocks" && c.blocks.map((b, i) => (
          <div className="adm-card mail-blk" key={i}>
            <div className="mail-blk-h"><b>{LBL[b.type]}</b><div className="grow" />
              <button className="adm-btn" onClick={() => move(i, -1)}>↑</button><button className="adm-btn" onClick={() => move(i, 1)}>↓</button><button className="adm-btn" onClick={() => del(i)}>✕</button></div>
            {b.type === "heading" && <input value={b.text || ""} onChange={(e) => setB(i, { text: e.target.value })} placeholder="Podnaslov" />}
            {b.type === "text" && <textarea rows={4} value={b.text || ""} onChange={(e) => setB(i, { text: e.target.value })} placeholder="Besedilo maila …" />}
            {b.type === "button" && <div style={{ display: "flex", gap: 8 }}>
              <input value={b.text || ""} onChange={(e) => setB(i, { text: e.target.value })} placeholder="Napis na gumbu" />
              <input value={b.url || ""} onChange={(e) => setB(i, { url: e.target.value })} placeholder="https://69slam.si/…" /></div>}
            {b.type === "image" && <div>
              {b.url ? <img src={b.url} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} /> : null}
              <label className="adm-btn" style={{ display: "inline-block", cursor: "pointer" }}>{b.uploading ? "Nalagam …" : b.url ? "Zamenjaj sliko" : "📷 Naloži sliko"}
                <input type="file" accept="image/*" hidden onChange={(e) => upload(i, e.target.files?.[0])} /></label>
              <input style={{ marginTop: 8 }} value={b.link || ""} onChange={(e) => setB(i, { link: e.target.value })} placeholder="Klik na sliko vodi na … (neobvezno, npr. https://69slam.si/sl/kopalke)" />
            </div>}
            {b.type === "products" && <ProductPicker stock={stock} codes={b.codes || []} onChange={(codes) => setB(i, { codes })} />}
          </div>
        ))}
        {mode === "blocks" && <div className="adm-chips" style={{ margin: "4px 0 16px" }}>
          {Object.entries(LBL).map(([k, l]) => <button key={k} onClick={() => add(k)}>+ {l}</button>)}
        </div>}
        <div className="adm-card" style={{ padding: 16, marginBottom: 12 }}>
          <div className="adm-field"><label>📅 Pošlji samodejno ob</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
              <button className="adm-btn pri" disabled={busy} onClick={async () => {
                if (!c.subject.trim()) { setMsg({ ok: false, t: "Vpiši zadevo maila." }); return; }
                if (!confirm(`Kampanja »${c.subject}« gre vsem naročnikom (${subs}) ob ${new Date(when).toLocaleString("sl-SI")}. Potrdim?`)) return;
                await save("schedule");
              }}>📅 Načrtuj pošiljanje</button>
            </div>
          </div>
          {c.status === "načrtovano" && c.scheduled_at && (
            <div className="adm-note ok" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              Načrtovano za <b>{new Date(c.scheduled_at).toLocaleString("sl-SI")}</b>
              <button className="adm-btn" disabled={busy} onClick={() => save("unschedule")}>Prekliči načrt</button>
            </div>
          )}
          <div className="muted" style={{ fontSize: 12.5 }}>Mail gre samodejno najkasneje 15 minut po izbranem času. Do takrat ga lahko še urejaš.</div>
        </div>
        <div className="adm-card" style={{ padding: 16 }}>
          <div className="adm-field"><label>Testni mail na</label>
            <div style={{ display: "flex", gap: 8 }}><input value={testTo} onChange={(e) => setTestTo(e.target.value)} /><button className="adm-btn" disabled={busy} onClick={() => save("test")}>✉️ Pošlji test</button></div></div>
          <button className="adm-btn pri" style={{ width: "100%", padding: 12 }} disabled={busy} onClick={sendAll}>🚀 Pošlji vsem naročnikom ({subs})</button>
        </div>
      </div>
      <div className="mail-ed-pv">
        <div className="muted" style={{ marginBottom: 6 }}>Predogled (osveži se ob shranjevanju)</div>
        {c.id ? <iframe key={pv} src={`/api/admin/campaigns?id=${c.id}&preview=1&v=${pv}`} title="Predogled" /> : <div className="adm-empty adm-card">Klikni »Shrani« za predogled.</div>}
      </div>
    </div>
  );
}

function ProductPicker({ stock, codes, onChange }) {
  const [q, setQ] = useState("");
  const by = useMemo(() => Object.fromEntries((stock || []).map((p) => [p.code, p])), [stock]);
  const hits = q.trim().length < 2 ? [] : (stock || []).filter((p) => p.total > 0 && !codes.includes(p.code) &&
    `${p.code} ${p.name} ${p.type || ""}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8);
  return (
    <div>
      <div className="mail-pp">
        {codes.map((code) => <span key={code} className="mail-pp-chip">{by[code]?.img && <img src={by[code].img} alt="" />}{by[code]?.name || code}
          <button onClick={() => onChange(codes.filter((x) => x !== code))}>✕</button></span>)}
        {!codes.length && <span className="muted">Dodaj artikle (2, 4 ali 6 izgleda najlepše).</span>}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Išči artikel po imenu ali šifri …" />
      {hits.length > 0 && <div className="mail-pp-hits">
        {hits.map((p) => <button key={p.code} onClick={() => { onChange([...codes, p.code]); setQ(""); }}>
          {p.img && <img src={p.img} alt="" />}<span><b>{p.name}</b><small>{p.code} · {p.total} kos</small></span></button>)}
      </div>}
    </div>
  );
}

function AutoMails() {
  const [d, setD] = useState(null);
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => { const r = await getJSON("/api/admin/mail"); setD(r); setS(r?.settings || null); }, []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  async function save() { const r = await post("/api/admin/mail", { settings: s }); setMsg({ ok: !!r?.ok, t: r?.ok ? "Nastavitve shranjene ✓" : "Napaka." }); load(); }
  async function run() { setMsg({ ok: true, t: "Pošiljam zapadle maile …" }); const r = await post("/api/admin/mail", { action: "run" }); setMsg({ ok: !!r?.ok, t: r?.skipped ? "Resend še ni nastavljen." : `Obdelanih: ${r?.processed ?? 0}` }); load(); }
  if (!d || !s) return <div className="adm-card adm-empty">Nalagam …</div>;
  const st = d.stats || {};
  return (
    <>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {!d.resend && <div className="adm-note err">⚠️ Resend še ni nastavljen — maili se ne pošiljajo.</div>}
      {!d.cron && <div className="adm-note">ℹ️ Samodejno pošiljanje še ni vklopljeno (manjka CRON_SECRET). Do takrat lahko klikneš »Pošlji zapadle zdaj«.</div>}
      <div className="adm-stats">
        <div className="adm-card adm-stat"><div className="k">Čaka na pošiljanje</div><div className="v">{st.waiting ?? 0}</div></div>
        <div className="adm-card adm-stat"><div className="k">Poslano (30 dni)</div><div className="v">{st.sent30 ?? 0}</div></div>
        <div className="adm-card adm-stat"><div className="k">Košarice z e-mailom (30 dni)</div><div className="v">{st.carts30 ?? 0}</div><div className="muted">rešenih: {st.recovered30 ?? 0}</div></div>
        <div className="adm-card adm-stat"><div className="k">Prodaja po opomniku</div><div className="v">{eur(st.recovered_cents || 0)}</div></div>
      </div>
      <div className="mail-auto">
        <div className="adm-card" style={{ padding: 18 }}>
          <label className="adm-check" style={{ fontWeight: 800, marginBottom: 10 }}><input type="checkbox" checked={!!s.review_on} onChange={set("review_on")} /> ⭐ Hvala + prošnja za oceno</label>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="adm-field" style={{ flex: 1 }}><label>Dni po nakupu</label><input type="number" min="1" max="60" value={s.review_days} onChange={set("review_days")} /></div>
            <div className="adm-field" style={{ flex: 1 }}><label>Koda za oceno (%)</label><input type="number" min="0" max="50" value={s.review_discount} onChange={set("review_discount")} /></div>
          </div>
          <div className="muted">Kupec po oddani oceni takoj dobi osebno kodo (HVALA-…, velja 60 dni, 1×). Ocene čakajo na tvojo odobritev v zavihku »Ocene«.</div>
        </div>
        <div className="adm-card" style={{ padding: 18 }}>
          <label className="adm-check" style={{ fontWeight: 800, marginBottom: 10 }}><input type="checkbox" checked={!!s.cart_on} onChange={set("cart_on")} /> 🛒 Zapuščena košarica</label>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="adm-field" style={{ flex: 1 }}><label>1. opomnik (ur)</label><input type="number" min="1" max="72" value={s.cart_h1} onChange={set("cart_h1")} /></div>
            <div className="adm-field" style={{ flex: 1 }}><label>2. opomnik (ur)</label><input type="number" min="2" max="168" value={s.cart_h2} onChange={set("cart_h2")} /></div>
            <div className="adm-field" style={{ flex: 1 }}><label>Koda v 2. (%)</label><input type="number" min="0" max="50" value={s.cart_discount2} onChange={set("cart_discount2")} /></div>
          </div>
          <div className="muted">Košarica se shrani, ko kupec na blagajni vpiše e-mail. Če kupi, se opomniki samodejno prekličejo. Koda KOSARICA-… velja 3 dni, 1×. 0 % = brez kode.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "12px 0 18px" }}>
        <button className="adm-btn pri" onClick={save}>💾 Shrani nastavitve</button>
        <button className="adm-btn" onClick={run}>▶ Pošlji zapadle zdaj</button>
      </div>
      <MailPreviews />
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Mail</th><th>Prejemnik</th><th>Kdaj</th><th>Stanje</th></tr></thead>
          <tbody>
            {!d.jobs?.length ? <tr><td colSpan={4} className="adm-empty">Še ni samodejnih mailov.</td></tr> :
              d.jobs.map((j) => (
                <tr key={j.id}>
                  <td>{JOBKIND[j.kind] || j.kind}</td>
                  <td className="muted">{j.email}</td>
                  <td className="muted">{dt(j.sent_at || j.send_at)}</td>
                  <td><span className={`adm-tag ${j.status === "poslano" ? "sub" : ""}`}>{JOBST[j.status] || j.status}</span>{j.info && j.status !== "poslano" && <div className="muted">{j.info}</div>}</td>
                </tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const PREVIEWS = [["confirm", "✅ Potrditev (kartica)"], ["upn", "🧾 Potrditev (predračun + QR)"], ["cod", "📦 Potrditev (po povzetju)"], ["shipped", "🚚 Paket je na poti"],
  ["review", "⭐ Hvala + ocena"], ["cart1", "🛒 Košarica – 1. opomnik"], ["cart2", "🛒 Košarica – 2. opomnik (koda)"]];
function MailPreviews() {
  const [k, setK] = useState("confirm");
  const [lang, setLang] = useState("sl");
  const [to, setTo] = useState("69slamslovenia@gmail.com");
  const [msg, setMsg] = useState(null);
  async function test() {
    setMsg({ ok: true, t: "Pošiljam …" });
    const d = await post(`/api/admin/mail/preview?kind=${k}&lang=${lang}`, { to });
    setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." });
  }
  return (
    <div className="adm-card" style={{ padding: 16, marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <b>👁 Predogled mailov</b><span className="muted">vzorčni podatki — nič se ne pošlje</span>
        <div className="grow" />
        <div className="adm-seg">{["sl", "en"].map((l) => <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}</div>
      </div>
      <div className="adm-chips" style={{ marginBottom: 12 }}>
        {PREVIEWS.map(([id, l]) => <button key={id} className={k === id ? "on" : ""} style={k === id ? { background: "var(--a-navy)", color: "#fff", borderColor: "var(--a-navy)" } : null} onClick={() => setK(id)}>{l}</button>)}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input className="adm-input" style={{ flex: 1, minWidth: 220 }} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className="adm-btn" onClick={test}>✉️ Pošlji ta mail kot test</button>
      </div>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <iframe title="Predogled maila" src={`/api/admin/mail/preview?kind=${k}&lang=${lang}`} style={{ width: "100%", maxWidth: 680, height: 760, border: "1px solid var(--a-line)", borderRadius: 14, background: "#f5f5f7", display: "block", margin: "0 auto" }} />
    </div>
  );
}

function Subscribers() {
  const [q, setQ] = useState("");
  const [list, setList] = useState(null);
  const [add, setAdd] = useState("");
  const [msg, setMsg] = useState(null);
  const load = useCallback(async (qq = "") => { const d = await getJSON(`/api/admin/mail?view=subs&q=${encodeURIComponent(qq)}`); setList(d?.subs || []); }, []);
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q, load]);
  async function act(email, action) { const d = await post("/api/admin/mail", { email, action }); setMsg({ ok: !!d?.ok, t: d?.ok ? "Urejeno ✓" : d?.message || "Napaka." }); if (action === "add") setAdd(""); load(q); }
  const SRC = { blagajna: "Blagajna", "noga strani": "Noga strani", "ročno": "Ročno", odjava: "—", stranka: "Stranka", kupec: "Kupec" };
  return (
    <>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input className="adm-input" style={{ flex: 1, minWidth: 200 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Išči e-mail ali ime" />
        <input className="adm-input" style={{ minWidth: 220 }} value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Dodaj e-mail ročno" />
        <button className="adm-btn" onClick={() => act(add, "add")}>+ Dodaj</button>
        <button className="adm-btn" onClick={async () => { const d = await post("/api/admin/mail", { action: "customers" }); setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." }); load(q); }}>👥 Dodaj vse stranke</button>
      </div>
      <div className="muted" style={{ marginBottom: 10 }}>Naročniki: prijave (Shopify, noga strani) in vse stranke — vsak kupec je dodan samodejno. Kdor se odjavi, ostane odjavljen. Prikazanih največ 300.</div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>E-mail</th><th>Vir</th><th>Prijava</th><th>Stanje</th><th></th></tr></thead>
          <tbody>
            {list === null ? <tr><td colSpan={5} className="adm-empty">Nalagam …</td></tr> :
             !list.length ? <tr><td colSpan={5} className="adm-empty">Ni zadetkov.</td></tr> :
             list.map((s) => (
              <tr key={s.id}>
                <td><div className="strong">{s.email}</div>{s.name && <div className="muted">{s.name}</div>}</td>
                <td className="muted">{SRC[s.source] || s.source || "Shopify"}</td>
                <td className="muted">{dShort(s.created_at)}</td>
                <td>{s.unsubscribed_at ? <span className="adm-tag">odjavljen {dShort(s.unsubscribed_at)}</span> : <span className="adm-tag sub">✓ aktiven</span>}</td>
                <td>{s.unsubscribed_at ? <button className="adm-btn" onClick={() => act(s.email, "resub")}>Ponovno prijavi</button> : <button className="adm-btn" onClick={() => act(s.email, "unsub")}>Odjavi</button>}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* =========================== OCENE =========================== */
const RST = { caka: "Čaka odobritev", objavljeno: "Objavljeno", skrito: "Skrito" };
function Reviews({ onCount }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState("caka");
  const load = useCallback(async () => { const d = await getJSON("/api/admin/reviews"); setList(d?.reviews || []); onCount?.((d?.reviews || []).filter((r) => r.status === "caka").length); }, [onCount]);
  useEffect(() => { load(); }, [load]);
  async function act(r, body) {
    if (body.delete && !confirm("Izbrišem to oceno za vedno?")) return;
    await post("/api/admin/reviews", { id: r.id, ...body }); load();
  }
  const rows = (list || []).filter((r) => f === "vse" || r.status === f);
  return (
    <>
      <div className="adm-top">
        <div><h1>Ocene kupcev</h1><div className="sub">Ocene iz e-maila »Kako so ti všeč?«. Objavljene se pokažejo na strani artikla pod »Kaj pravijo kupci«.</div></div>
        <div className="grow" />
        <div className="adm-seg">
          {[["caka", "Čakajo"], ["objavljeno", "Objavljene"], ["skrito", "Skrite"], ["vse", "Vse"]].map(([k, l]) => (
            <button key={k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{l}</button>))}
        </div>
      </div>
      {list === null ? <div className="adm-card adm-empty">Nalagam …</div> : !rows.length ? <div className="adm-card adm-empty">Ni ocen v tem pogledu.</div> :
        <div className="rv-adm">
          {rows.map((r) => (
            <div className="adm-card rv-adm-card" key={r.id}>
              <div className="rv-adm-h">{r.img && <img src={r.img} alt="" />}<div><b>{r.pname}</b><div className="muted">{r.code} · naročilo #{r.number} · {dShort(r.created_at)}</div></div></div>
              <div className="rv-adm-stars">{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></div>
              {r.title && <b>{r.title}</b>}
              {r.body ? <p>{r.body}</p> : <p className="muted">(brez besedila)</p>}
              <div className="muted">— {r.name} · {r.email}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <span className={`adm-tag ${r.status === "objavljeno" ? "sub" : ""}`}>{RST[r.status]}</span>
                <div className="grow" />
                {r.status !== "objavljeno" && <button className="adm-btn pri" onClick={() => act(r, { status: "objavljeno" })}>✓ Objavi</button>}
                {r.status !== "skrito" && <button className="adm-btn" onClick={() => act(r, { status: "skrito" })}>Skrij</button>}
                <button className="adm-btn" onClick={() => act(r, { delete: true })}>✕</button>
              </div>
            </div>))}
        </div>}
    </>
  );
}

/* =========================== RAČUNI =========================== */
const PAYL = { trr: "Nakazilo na TRR", gotovina: "Gotovina", kartica: "Plačilna kartica", povzetje: "Po povzetju", placano: "Že plačano" };
const VATS = [22, 9.5, 5, 0];
const numIn = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
function calcInv(items, gross) {
  const g = {};
  for (const it of items) {
    if (!String(it.desc || "").trim()) continue;
    const a = Math.round(numIn(it.qty) * numIn(it.price) * 100 * (1 - Math.min(100, numIn(it.disc)) / 100));
    g[it.vat] = (g[it.vat] || 0) + a;
  }
  let net = 0, vat = 0, total = 0;
  for (const [r, sum] of Object.entries(g)) {
    const rate = Number(r) / 100;
    const base = gross ? Math.round(sum / (1 + rate)) : sum;
    const v = gross ? sum - base : Math.round(sum * rate);
    net += base; vat += v; total += base + v;
  }
  return { net, vat, total };
}
/* PDF pregledovalnik v CMS: predogled + Natisni + Shrani PDF */
function showPdf(promise, name) {
  window.dispatchEvent(new CustomEvent("adm-pdf", { detail: { loading: true, name } }));
  promise.then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => "Napaka"));
    const blob = await r.blob();
    window.dispatchEvent(new CustomEvent("adm-pdf", { detail: { url: URL.createObjectURL(blob), name } }));
  }).catch((e) => window.dispatchEvent(new CustomEvent("adm-pdf", { detail: { error: String(e.message || e).slice(0, 200), name } })));
}
function openPdf(body, name = "predogled.pdf") {
  showPdf(fetch("/api/admin/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), name);
}
function openPdfId(id, name) { showPdf(fetch(`/api/admin/invoices?pdf=${id}`), name || `dokument-${id}.pdf`); }
const pdfName = (r) => `${{ racun: "racun", dobropis: "dobropis", predracun: "predracun", dobavnica: "dobavnica" }[r.kind] || "racun"}-${r.number}.pdf`;

function PdfViewer() {
  const [v, setV] = useState(null);
  const frame = useRef(null);
  useEffect(() => {
    const h = (e) => setV((old) => { if (old?.url && old.url !== e.detail.url) URL.revokeObjectURL(old.url); return e.detail; });
    window.addEventListener("adm-pdf", h);
    return () => window.removeEventListener("adm-pdf", h);
  }, []);
  useEffect(() => { const k = (e) => e.key === "Escape" && setV(null); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  if (!v) return null;
  const print = () => { try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); } catch { window.open(v.url, "_blank"); } };
  return (
    <div className="adm-ov" style={{ zIndex: 300 }} onClick={(e) => e.target === e.currentTarget && setV(null)}>
      <div className="pdfv">
        <div className="pdfv-top">
          <b>{v.name}</b><div className="grow" />
          {v.url && <>
            <button className="adm-btn" onClick={print}>🖨️ Natisni</button>
            <a className="adm-btn pri" href={v.url} download={v.name} style={{ textDecoration: "none" }}>⬇️ Shrani PDF</a>
            <a className="adm-btn" href={v.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>↗ Odpri v zavihku</a>
          </>}
          <button className="adm-btn" onClick={() => setV(null)}>✕</button>
        </div>
        {v.loading ? <div className="adm-empty">Pripravljam PDF …</div>
          : v.error ? <div className="adm-note err" style={{ margin: 16 }}>PDF-ja ni bilo mogoče narediti: {v.error}</div>
          : <iframe ref={frame} src={v.url} title={v.name} />}
      </div>
    </div>
  );
}

const DOCK = { racun: "Računi", predracun: "Predračuni", dobavnica: "Dobavnice" };
const DOC1 = { racun: "račun", predracun: "predračun", dobavnica: "dobavnico", dobropis: "dobropis" };
function Invoices() {
  const [tab, setTab] = useState("racun");
  const [list, setList] = useState(null);
  const [month, setMonth] = useState(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState(null);
  const [send, setSend] = useState(null); // { inv, to }
  const [trk, setTrk] = useState({});
  const [credit, setCredit] = useState(null);
  const [draft, setDraft] = useState(null);
  const [formKey, setFormKey] = useState(0);
  function editDoc(r) {
    setDraft({ id: null, edit: { id: r.id, number: r.number }, data: { kind: r.kind, ctype: r.customer_vat ? "podjetje" : "fizicna", gross: !!r.prices_gross, payment: r.payment,
      due_days: Math.max(0, Math.round((new Date(r.due_date) - new Date(String(r.issued_at).slice(0, 10))) / 86400000)) || 8,
      service_date: String(r.service_date || "").slice(0, 10), notes: r.notes || "", tracking: r.tracking || "",
      customer: { name: r.customer_name || "", address: r.customer_address || "", zip_city: r.customer_zip_city || "", country: r.customer_country || "Slovenija", vat: r.customer_vat || "", email: r.customer_email || "" },
      items: (r.items || []).map((it) => ({ code: it.code || "", desc: it.desc || "", qty: String(it.qty ?? 1).replace(".", ","), unit: it.unit || "kos",
        price: it.price != null ? Number(it.price).toFixed(2).replace(".", ",") : "", disc: it.disc ? String(it.disc).replace(".", ",") : "", vat: it.vat ?? 22 })) } });
    setFormKey((k) => k + 1); setTab("nov");
  }
  const [dKey, setDKey] = useState(0);
  const [closeM, setCloseM] = useState(false);
  const listTab = ["racun", "dobropis", "predracun", "dobavnica", "arhiv"].includes(tab);
  const load = useCallback(async (qq = "", k = tab) => {
    if (!["racun", "dobropis", "predracun", "dobavnica", "arhiv"].includes(k)) return;
    setList(null);
    const d = await getJSON(`/api/admin/invoices?kind=${k}&q=${encodeURIComponent(qq)}`); setList(d?.invoices || []); setMonth(d?.month || null);
  }, [tab]);
  useEffect(() => { const t = setTimeout(() => load(q, tab), 250); return () => clearTimeout(t); }, [q, tab, load]);
  async function act(inv, action) {
    if (action === "storno" && !confirm(`Storniram račun ${inv.number}? Izdal se bo dobropis z negativnimi zneski.`)) return;
    if (action === "convert" && !confirm(`Iz ${inv.number} naredim račun?`)) return;
    const d = await post("/api/admin/invoices", { action, id: inv.id });
    if (d?.message) setMsg({ ok: !!d.ok, t: d.message });
    load(q, tab);
  }
  async function shipped(inv) {
    const t = (trk[inv.id] ?? inv.tracking ?? "").trim();
    if (!t && !confirm("Ni vpisane številke pošiljke. Vseeno označim kot poslano?")) return;
    setMsg({ ok: true, t: "Označujem kot poslano, izdajam račun in pošiljam kupcu …" });
    const r = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inv.order_id, status: "poslano", tracking: t }) }).then((x) => x.json()).catch(() => null);
    setMsg({ ok: !!r?.ok, t: r?.ok ? `Poslano ✓${r.invoice ? ` — račun ${r.invoice}` : ""}${r.mailed ? " poslan kupcu po e-mailu" : ""}.` : "Napaka." });
    load(q, tab);
  }
  async function doSend() {
    setMsg({ ok: true, t: "Pošiljam …" });
    const d = await post("/api/admin/invoices", { action: "send", id: send.inv.id, to: send.to, note: send.note || "" });
    setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." }); setSend(null); load(q, tab);
  }
  return (
    <>
      <div className="adm-top">
        <div><h1>Računi & dokumenti</h1><div className="sub">Spletno naročilo → dobavnica → »Poslano« → račun (gre kupcu po e-mailu). Ročni predračun/dobavnica → »Ustvari račun«. 🌱 Samo e-mail, brez tiskanja.</div></div>
        <div className="grow" />
        <div className="adm-seg">
          {[["nov", "+ Nov vnos"], ["predracun", "Predračun"], ["dobavnica", "Dobavnica"], ["racun", "Račun"], ["dobropis", "Dobropis"], ["arhiv", "Arhiv Metakocka"], ["oblika", "Oblika"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
        </div>
      </div>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      {tab === "nov" && <DraftList key={`dl-${dKey}`} current={draft?.id} onOpen={(d) => { setDraft(d); setFormKey((k) => k + 1); }} onNew={() => { setDraft(null); setFormKey((k) => k + 1); }} />}
      {tab === "nov" && <InvoiceForm key={`f-${formKey}`} draft={draft} onDraft={() => setDKey((k) => k + 1)} onDone={(m, k) => { setDraft(null); setFormKey((x) => x + 1); setMsg(m); setTab(k || "racun"); }} />}
      {tab === "oblika" && <InvoiceSettings />}
      {tab === "oblika" && <FursSettings />}
      {tab === "arhiv" && <MkImport stats={month} onDone={() => load(q, "arhiv")} />}
      {listTab && (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <input className="adm-input" style={{ flex: 1, minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Išči po številki, kupcu, e-mailu, naročilu" />
            {tab === "arhiv" && month && <span className="muted">V arhivu: <b>{month.n}</b> dokumentov ({month.dbp || 0} dobropisov) · <b>{eur(month.total)}</b> · povezanih z naročili: <b>{month.linked || 0}</b></span>}
            {tab === "racun" && <button className="adm-btn pri" onClick={() => setCloseM(true)}>📦 Zaključi mesec</button>}
            {tab === "racun" && month && <span className="muted">Ta mesec: <b>{month.n}</b> računov · <b>{eur(month.total)}</b></span>}
          </div>
          <div className="adm-card adm-scroll">
            <table className="adm-tbl">
              <thead><tr><th>Številka</th><th>Datum</th><th>Kupec</th><th className="r">Znesek</th><th>{tab === "dobavnica" ? "Pošiljka" : "Plačilo"}</th><th>Stanje</th><th></th></tr></thead>
              <tbody>
                {list === null ? <tr><td colSpan={7} className="adm-empty">Nalagam …</td></tr> :
                 !list.length ? <tr><td colSpan={7} className="adm-empty">{tab === "arhiv" ? "Arhiv je prazen — uvozi izvoze iz Metakocke zgoraj." : tab === "dobropis" ? "Še ni dobropisov. Dobropis narediš pri računu z gumbom »↩️ Dobropis«." : tab === "dobavnica" ? "Dobavnice spletnih naročil se naredijo same ob novem naročilu." : tab === "predracun" ? "Predračuni se naredijo sami pri plačilu po predračunu — ali klikni »+ Nov vnos«." : "Še ni računov."}</td></tr> :
                 list.map((r) => {
                  const open = r.status === "izdan" && !r.converted_to;
                  const ark = r.series === "MK";
                  const canShip = r.kind === "dobavnica" && r.order_id && open && r.order_status !== "poslano" && r.order_status !== "preklicano";
                  return (
                  <tr key={r.id}>
                    <td><div className="strong">{r.number}</div><div className="muted">{r.kind === "dobropis" ? `Dobropis k ${r.ref_number}${r.meta?.shop ? ` · ${/^\d+$/.test(r.meta.shop) ? "#" : ""}${r.meta.shop}` : ""}` : r.order_number ? `Spletno naročilo #${r.order_number}` : ark ? (r.meta?.shop ? (/^\d{4,5}$/.test(r.meta.shop) ? `Shopify #${r.meta.shop} (ni v CMS)` : `Naročilo: ${r.meta.shop}`) : "Brez naročila (osebno / B2B)") : "Ročni dokument"}</div></td>
                    <td className="muted">{dShort(r.issued_at)}</td>
                    <td><div>{r.customer_name}</div>{r.customer_email && <div className="muted">{r.customer_email}</div>}</td>
                    <td className="r num strong">{eur(r.total_cents)}</td>
                    <td className="muted">{tab === "dobavnica"
                      ? (canShip ? <input className="adm-input" style={{ width: 150, padding: "6px 8px" }} placeholder="Št. pošiljke" value={trk[r.id] ?? r.tracking ?? ""} onChange={(e) => setTrk((x) => ({ ...x, [r.id]: e.target.value }))} /> : (r.tracking || "—"))
                      : <>{PAYL[r.payment] || r.payment}{r.payment === "trr" && r.kind === "racun" ? <div>{r.paid_at ? <span className="adm-tag sub">✓ plačano</span> : <span className="adm-tag">rok {dShort(r.due_date)}</span>}</div> : null}</>}</td>
                    <td>{!ark && r.furs_status && <div style={{ marginBottom: 4 }} title={r.eor ? `EOR ${r.eor}` : r.furs_error || ""}><span className="adm-tag sub" style={r.furs_status === "potrjen" ? {} : { background: "#fff8e1", color: "#5c4a00" }}>{r.furs_status === "potrjen" ? "FURS ✓" : r.furs_status === "caka" ? "⏳ FURS čaka" : "⚠️ FURS napaka"}</span></div>}
                      {r.credited > 0 && r.kind === "racun" && !ark ? <span className="adm-tag">{r.credited >= r.total_cents ? "↩️ v celoti dobropisan" : `↩️ dobropis ${eur(r.credited)}`}</span> : ark ? <span className="adm-tag sub">{r.meta?.eor ? "🗄️ arhiv · FURS ✓" : "🗄️ arhiv"}</span> : r.status === "storniran" ? <span className="adm-tag">storniran</span> : r.status === "preklican" ? <span className="adm-tag">preklican</span>
                      : r.converted_to ? <span className="adm-tag sub">→ račun {r.converted_to}</span> : r.sent_at ? <span className="adm-tag sub">✉️ poslan</span> : <span className="adm-tag">{r.kind === "dobavnica" ? "za pakiranje" : "ni poslan"}</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {canShip && <><button className="adm-btn pri" onClick={() => shipped(r)}>📦 Poslano</button>{" "}</>}
                      {!canShip && open && (r.kind === "predracun" || r.kind === "dobavnica") && <><button className="adm-btn pri" onClick={() => act(r, "convert")}>🧾 Ustvari račun</button>{" "}</>}
                      {open && r.kind === "predracun" && !r.order_id && <><button className="adm-btn" onClick={async () => { const x = await getJSON(`/api/admin/invoices?credit=${r.id}`); if (x?.invoice) editDoc(x.invoice); }}>✏️ Uredi</button>{" "}</>}
                      {!ark && ["caka", "napaka"].includes(r.furs_status) && <><button className="adm-btn pri" title={r.furs_error || ""} onClick={async () => { const x = await post("/api/admin/furs", { action: "retry", id: r.id }); setMsg({ ok: !!x?.ok, t: x?.message || "Napaka." }); load(q, tab); }}>↻ FURS</button>{" "}</>}
                      <button className="adm-btn" onClick={() => openPdfId(r.id, pdfName(r))}>📄 PDF</button>{" "}
                      <button className="adm-btn" onClick={() => setSend({ inv: r, to: r.sent_to || r.customer_email || "" })}>✉️</button>{" "}
                      {!ark && r.payment === "trr" && r.kind === "racun" && r.status !== "storniran" && <><button className="adm-btn" onClick={() => act(r, "paid")}>{r.paid_at ? "Ni plačano" : "Plačano"}</button>{" "}</>}
                      {!ark && r.kind === "racun" && r.status !== "storniran" && !(r.credited >= r.total_cents) && <><button className="adm-btn" onClick={() => setCredit(r)}>↩️ Dobropis</button>{" "}</>}
                      {!ark && r.kind === "racun" && r.status !== "storniran" && !(r.credited >= r.total_cents) && <button className="adm-btn" onClick={() => act(r, "storno")}>Storno</button>}
                    </td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {closeM && <MonthClose onClose={() => setCloseM(false)} />}
      {credit && <CreditModal inv={credit} onClose={() => setCredit(null)} onDone={(m) => { setCredit(null); setMsg(m); load(q, tab); }} />}
      {send && (
        <div className="adm-ov" onClick={(e) => e.target === e.currentTarget && setSend(null)}>
          <div className="adm-modal" style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 440 }}>
            <div className="adm-mh"><h3>Pošlji {send.inv.number}</h3><button className="x" onClick={() => setSend(null)}>✕</button></div>
            <div className="adm-mb">
              <div className="adm-field"><label>E-mail prejemnika</label><input value={send.to} onChange={(e) => setSend({ ...send, to: e.target.value })} placeholder="kupec@email.si" /></div>
              <div className="adm-field"><label>Sporočilo kupcu (neobvezno)</label>
                <textarea rows={4} value={send.note || ""} onChange={(e) => setSend({ ...send, note: e.target.value })} placeholder={"npr. Živjo Andrej, hvala za nakup! Lep pozdrav, Claudia"} style={{ width: "100%" }} /></div>
              <div className="muted" style={{ fontSize: 12, margin: "-4px 0 12px", lineHeight: 1.5 }}>Mail že sam napiše: »Pozdravljeni, v prilogi vam pošiljamo {(KIND_NAME_UI[send.inv.kind] || "račun").toLowerCase()} št. {send.inv.number} v znesku {eur(Math.abs(send.inv.total_cents))}{send.inv.payment === "trr" && ["racun", "predracun"].includes(send.inv.kind) ? ", rok plačila … z UPN QR kodo" : ""}.« Tvoje sporočilo se doda nad to besedilo.</div>
              <button className="adm-btn pri" onClick={doSend}>✉️ Pošlji PDF</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceForm({ onDone, draft, onDraft }) {
  const D = draft?.data || {};
  const edit = draft?.edit || null;
  const [draftId, setDraftId] = useState(draft?.id || null);
  const [kind, setKind] = useState(D.kind || "racun");
  const [tracking, setTracking] = useState(D.tracking || "");
  const blankItem = () => ({ code: "", desc: "", qty: "1", unit: "kos", price: "", disc: "", vat: 22 });
  const [c, setC] = useState({ name: "", address: "", zip_city: "", country: "Slovenija", vat: "", email: "", ...(D.customer || {}) });
  const [items, setItems] = useState(D.items?.length ? D.items : [blankItem()]);
  const [gross, setGross] = useState(D.gross === undefined ? true : !!D.gross);
  const [payment, setPayment] = useState(D.payment || "trr");
  const [dueDays, setDueDays] = useState(D.due_days != null ? String(D.due_days) : "8");
  const [serviceDate, setServiceDate] = useState(D.service_date || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(D.notes || "");
  const [info, setInfo] = useState("");
  const [past, setPast] = useState([]);
  const [ctype, setCtype] = useState(D.ctype || (D.customer?.vat ? "podjetje" : "fizicna"));
  const [openS, setOpenS] = useState(false);
  const [look, setLook] = useState(null);
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const hits = (() => {
    const q = norm(c.name).trim();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    return past.filter((p) => { const h = norm(`${p.name} ${p.email || ""} ${p.vat || ""}`); return words.every((w) => h.includes(w)); }).slice(0, 10);
  })();
  function pickPast(p) {
    setC({ name: p.name || "", address: p.address || "", zip_city: p.zip_city || "", country: p.country || "Slovenija", vat: p.vat || "", email: p.email || "" });
    if (p.vat) setCtype("podjetje");
    setOpenS(false);
  }
  async function lookup() {
    const v = String(c.vat || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/\d{8}/.test(v)) { setLook({ ok: false, t: "Vpiši 8-mestno davčno številko." }); return; }
    const num = v.replace(/^SI/, "");
    const known = past.find((p) => String(p.vat || "").replace(/\D/g, "") === num && p.name);
    setLook({ busy: true });
    const d = await getJSON(`/api/admin/company?vat=${encodeURIComponent(v)}`);
    if (d?.ok) {
      const k = d.company;
      setC((x) => ({ ...x, name: k.name, address: k.address, zip_city: k.zip_city, country: k.country, vat: k.vat, email: x.email || known?.email || "" }));
      setLook({ ok: true, t: "✓ Podatki iz registra zavezancev za DDV" });
    } else if (known) {
      pickPast(known); setLook({ ok: true, t: "✓ Najdeno med preteklimi kupci (ni zavezanec za DDV)" });
    } else setLook({ ok: false, t: d?.message || "Ni najdeno — vpiši ročno." });
  }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { getJSON("/api/admin/invoices?customers=1").then((d) => setPast(d?.customers || [])); !draft && getJSON("/api/admin/invoices?settings=1").then((d) => d?.settings && setDueDays(String(d.settings.due_days))); }, []);
  const setI = (i, k, v) => setItems((x) => x.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const sc = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.value }));
  const [arts, setArts] = useState([]);
  const [openA, setOpenA] = useState(-1);
  const [allDisc, setAllDisc] = useState("");
  const applyAll = (v) => { setAllDisc(v); setItems((x) => x.map((it) => (String(it.desc || "").trim() || String(it.price || "").trim() ? { ...it, disc: v } : it))); };
  const [aPos, setAPos] = useState(null);
  const aEl = useRef(null);
  useEffect(() => {
    if (openA < 0) return;
    const f = () => aEl.current && openArt(openA, aEl.current);
    window.addEventListener("scroll", f, true); window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f, true); window.removeEventListener("resize", f); };
  }, [openA]);
  const openArt = (i, el) => { aEl.current = el; const r = el.getBoundingClientRect(); setAPos({ left: r.left, top: r.bottom + 4, below: window.innerHeight - r.bottom - 12 }); setOpenA(i); };
  useEffect(() => { getJSON("/api/admin/stock").then((d) => setArts(d?.products || [])); }, []);
  const artHits = (txt) => {
    const q = norm(txt).trim();
    if (q.length < 2) return [];
    const SZ = ["xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl"];
    const all = q.split(/\s+/);
    const sizeW = all.filter((w) => SZ.includes(w));
    const words = all.filter((w) => !SZ.includes(w));
    if (!words.length) return [];
    const out = [];
    for (const p of arts) {
      const h = norm(`${p.code} ${p.name} ${p.type || ""} ${p.category || ""} ${p.material || ""}`);
      const sz = Object.entries(p.sizes || {});
      for (const [size, v] of sz) {
        const hs = `${h} ${norm(v.sku)}`;
        if (sizeW.length && !sizeW.includes(norm(size))) continue;
        if (words.every((w) => hs.includes(w))) out.push({ p, size, sku: v.sku, stock: v.stock });
      }
    }
    out.sort((x, y) => (y.stock > 0) - (x.stock > 0) || x.p.name.localeCompare(y.p.name));
    return out.slice(0, 40);
  };
  function pickArt(i, h) {
    const cents = h.p.price_cents || 0;
    const price = gross ? cents / 100 : Math.round(cents / 1.22) / 100;
    const label = [h.p.type || h.p.category, h.p.name].filter(Boolean).join(" | ") + (h.size && h.size !== "ONE" ? ` | ${h.size}` : "");
    setItems((x) => x.map((it, j) => (j === i ? { ...it, desc: label, code: h.sku || h.p.code, unit: "kos", vat: 22, disc: allDisc || it.disc, price: price ? price.toFixed(2).replace(".", ",") : it.price } : it)));
    setOpenA(-1);
  }
  const tot = calcInv(items, gross);
  const body = () => ({ kind, tracking, customer: ctype === "podjetje" ? c : { ...c, vat: "" }, items, gross, payment, due_days: payment === "trr" ? numIn(dueDays) : 0, service_date: serviceDate, notes });
  async function saveDraft() {
    setErr(""); setBusy(true);
    const d = await post("/api/admin/invoices", { action: "draft_save", draft_id: draftId, data: { ...body(), customer: c, ctype, due_days: dueDays } });
    setBusy(false);
    if (d?.ok) { setDraftId(d.draft_id); setInfo("✓ Osnutek shranjen " + new Date().toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })); onDraft?.(); }
    else setErr(d?.message || "Napaka.");
  }
  async function saveEdit(send) {
    setErr("");
    if (send && !c.email.trim()) { setErr("Za pošiljanje vpiši e-mail kupca."); return; }
    setBusy(true);
    const d = await post("/api/admin/invoices", { action: "update", id: edit.id, ...body(), send });
    setBusy(false);
    if (d?.ok) onDone({ ok: true, t: d.message }, kind); else setErr(d?.message || "Napaka.");
  }
  async function issue(send) {
    if (edit) return saveEdit(send);
    setErr("");
    if (send && !c.email.trim()) { setErr("Za pošiljanje vpiši e-mail kupca."); return; }
    if (!confirm(`Izdam ${DOC1[kind]} za ${c.name || "kupca"} v znesku ${eur(tot.total)}?${send ? `\nPoslan bo na ${c.email}.` : ""}\n\nIzdanega dokumenta ni mogoče spreminjati.`)) return;
    setBusy(true);
    const d = await post("/api/admin/invoices", { action: "issue", ...body(), send, draft_id: draftId });
    setBusy(false);
    if (d?.ok) onDone({ ok: true, t: d.message }, kind); else setErr(d?.message || "Napaka.");
  }
  return (
    <div className="inv-form">
      <div className="adm-card" style={{ padding: 14, marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b>Vrsta dokumenta</b>
        {edit ? <b style={{ color: "#b45309" }}>✏️ Urejaš {edit.number} — številka ostane ista</b> : <div className="adm-seg">{[["predracun", "Predračun"], ["dobavnica", "Dobavnica"], ["racun", "Račun"]].map(([k, l]) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>)}</div>}
        {kind === "dobavnica" && <input className="adm-input" style={{ minWidth: 200 }} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Št. pošiljke (neobvezno)" />}
        <span className="muted">{kind === "racun" ? "Uradni račun — številka 2026-…" : kind === "predracun" ? "PR-2026-… z UPN QR kodo; kasneje »Ustvari račun«." : "DOB-2026-… s cenami; kasneje »Ustvari račun«."}</span>
      </div>
      <div className="adm-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <b>Kupec</b>
          <div className="adm-seg">{[["fizicna", "👤 Fizična oseba"], ["podjetje", "🏢 Podjetje / s.p."]].map(([k, l]) => <button key={k} className={ctype === k ? "on" : ""} onClick={() => { setCtype(k); setLook(null); }}>{l}</button>)}</div>
        </div>
        {ctype === "podjetje" && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
            <div className="adm-field" style={{ margin: 0, flex: "0 1 260px" }}><label>Davčna številka</label>
              <input value={c.vat} onChange={sc("vat")} placeholder="12345678 ali SI12345678" inputMode="numeric" onKeyDown={(e) => e.key === "Enter" && lookup()} /></div>
            <button className="adm-btn pri" disabled={look?.busy} onClick={lookup}>{look?.busy ? "Iščem …" : "🔍 Poišči podatke"}</button>
            {look?.t && <span className={look.ok ? "muted" : ""} style={{ color: look.ok ? undefined : "#b45309", fontSize: 13 }}>{look.t}</span>}
          </div>
        )}
        <div className="inv-grid">
          <div className="adm-field" style={{ gridColumn: "1 / -1", position: "relative" }}><label>{ctype === "podjetje" ? "Naziv podjetja" : "Ime in priimek"} — začni tipkati za iskanje med preteklimi kupci</label>
            <input value={c.name} onChange={(e) => { sc("name")(e); setOpenS(true); }} onFocus={() => setOpenS(true)} onBlur={() => setTimeout(() => setOpenS(false), 150)}
              placeholder={ctype === "podjetje" ? "npr. ALPSKA ŠOLA … s.p." : "npr. Janez Novak"} autoComplete="off" />
            {openS && hits.length > 0 && (
              <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.12)", maxHeight: 280, overflowY: "auto", marginTop: 4 }}>
                {hits.map((p, i) => (
                  <div key={i} onMouseDown={() => pickPast(p)} style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <div className="strong" style={{ fontSize: 14 }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{[p.address, p.zip_city, p.vat, p.email].filter(Boolean).join(" · ")}</div>
                  </div>))}
              </div>)}
          </div>
          <div className="adm-field"><label>Naslov</label><input value={c.address} onChange={sc("address")} /></div>
          <div className="adm-field"><label>Pošta in kraj</label><input value={c.zip_city} onChange={sc("zip_city")} placeholder="3210 Slovenske Konjice" /></div>
          <div className="adm-field"><label>Država</label><input value={c.country} onChange={sc("country")} /></div>
          <div className="adm-field"><label>E-mail (za pošiljanje računa)</label><input value={c.email} onChange={sc("email")} /></div>
        </div>
      </div>

      <div className="adm-card" style={{ padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <b>Postavke</b><div className="grow" />
          <label className="adm-check"><input type="checkbox" checked={gross} onChange={(e) => { const g = e.target.checked; setGross(g);
            setItems((x) => x.map((it) => { const p = numIn(it.price); if (!p) return it; const v = 1 + (Number(it.vat) || 0) / 100; const np = g ? Math.round(p * v * 100) / 100 : Math.round((p / v) * 100) / 100; return { ...it, price: np.toFixed(2).replace(".", ",") }; })); }} /> Cene vključujejo DDV (maloprodaja)</label>
        </div>
        <div className="adm-scroll">
          <table className="adm-tbl inv-items">
            <thead><tr><th style={{ width: 28 }}>#</th><th style={{ width: "34%" }}>Opis (lahko karkoli)</th><th>Šifra</th><th>Kol.</th><th>EM</th><th>{gross ? "Cena z DDV" : "Cena brez DDV"}</th><th>Pop. %</th><th>DDV %</th><th className="r">Vrednost</th><th></th></tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="strong num" style={{ color: "var(--a-muted)", verticalAlign: "middle" }}>{i + 1}.</td>
                  <td style={{ position: "relative" }}><textarea rows={Math.max(1, Math.ceil(String(it.desc || "").length / 42))} style={{ fieldSizing: "content", minHeight: 40, resize: "vertical", lineHeight: 1.35 }} value={it.desc} onChange={(e) => { setI(i, "desc", e.target.value); openArt(i, e.target); }} onFocus={(e) => openArt(i, e.target)} onBlur={() => setTimeout(() => setOpenA((o) => (o === i ? -1 : o)), 150)} placeholder="Vtipkaj šifro ali ime artikla (npr. MBY tropical L) ali poljuben opis" />
                    {openA === i && aPos && artHits(it.desc).length > 0 && (
                      <div style={{ position: "fixed", left: Math.max(8, Math.min(aPos.left, window.innerWidth - 568)), top: aPos.top, zIndex: 1000, width: "min(560px, calc(100vw - 16px))", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.12)", maxHeight: Math.max(180, Math.min(360, aPos.below)), overflowY: "auto" }}>
                        {artHits(it.desc).map((h, k) => (
                          <div key={k} onMouseDown={() => pickArt(i, h)} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0", opacity: h.stock > 0 ? 1 : 0.45 }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")} onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                            {h.p.img ? <img src={h.p.img} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flex: "none" }} /> : <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f5f5f7", flex: "none" }} />}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="strong" style={{ fontSize: 14 }}>{h.p.name} · {h.size}</div>
                              <div className="muted" style={{ fontSize: 12 }}>{h.sku} · {h.p.type || h.p.category || ""}</div>
                            </div>
                            <div style={{ textAlign: "right", fontSize: 12, flex: "none" }}>
                              <div className="strong">{eur(h.p.price_cents || 0)}</div>
                              <div style={{ color: h.stock > 0 ? "#047857" : "#b91c1c" }}>zaloga {h.stock}</div>
                            </div>
                          </div>))}
                      </div>)}
                  </td>
                  <td><input value={it.code} onChange={(e) => setI(i, "code", e.target.value)} style={{ width: 90 }} /></td>
                  <td><input value={it.qty} onChange={(e) => setI(i, "qty", e.target.value)} style={{ width: 56 }} inputMode="decimal" /></td>
                  <td><input value={it.unit} onChange={(e) => setI(i, "unit", e.target.value)} style={{ width: 52 }} /></td>
                  <td><input value={it.price} onChange={(e) => setI(i, "price", e.target.value)} style={{ width: 84 }} inputMode="decimal" placeholder="0,00" /></td>
                  <td><input value={it.disc} onChange={(e) => setI(i, "disc", e.target.value)} style={{ width: 52 }} inputMode="decimal" /></td>
                  <td><select value={it.vat} onChange={(e) => setI(i, "vat", Number(e.target.value))}>{VATS.map((v) => <option key={v} value={v}>{String(v).replace(".", ",")}</option>)}</select></td>
                  <td className="r num">{eur(Math.round(numIn(it.qty) * numIn(it.price) * 100 * (1 - Math.min(100, numIn(it.disc)) / 100)))}</td>
                  <td><button className="adm-btn" onClick={() => setItems((x) => x.length > 1 ? x.filter((_, j) => j !== i) : [blankItem()])}>✕</button></td>
                </tr>))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
          <button className="adm-btn" onClick={() => setItems((x) => [...x, { ...blankItem(), disc: allDisc }])}>+ Dodaj postavko</button>
          <div className="grow" />
          <label className="strong" style={{ fontSize: 14 }}>Popust na vse postavke</label>
          <input value={allDisc} onChange={(e) => applyAll(e.target.value)} inputMode="decimal" placeholder="0" style={{ width: 64, textAlign: "right" }} />
          <span>%</span>
          {[10, 15, 20, 30, 50].map((v) => <button key={v} className={"adm-btn" + (String(allDisc) === String(v) ? " pri" : "")} onClick={() => applyAll(String(v))}>{v} %</button>)}
          {allDisc !== "" && <button className="adm-btn" onClick={() => applyAll("")}>✕ brez</button>}
        </div>
        <div className="inv-tot">
          <div><span>Postavk / kosov</span><b>{items.filter((it) => String(it.desc || "").trim()).length} / {items.filter((it) => String(it.desc || "").trim() && String(it.code || "").trim()).reduce((a, it) => a + numIn(it.qty), 0)}</b></div>
          <div><span>Skupaj brez DDV</span><b>{eur(tot.net)}</b></div>
          <div><span>DDV</span><b>{eur(tot.vat)}</b></div>
          <div className="big"><span>Za plačilo</span><b>{eur(tot.total)}</b></div>
        </div>
      </div>

      <div className="adm-card" style={{ padding: 16, marginTop: 12 }}>
        <div className="inv-grid">
          <div className="adm-field"><label>Način plačila</label><select value={payment} onChange={(e) => setPayment(e.target.value)}>{Object.entries(PAYL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          {payment === "trr" && <div className="adm-field"><label>Rok plačila (dni)</label><input value={dueDays} onChange={(e) => setDueDays(e.target.value)} inputMode="numeric" /></div>}
          <div className="adm-field"><label>Datum storitve / dobave</label><input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} /></div>
          <div className="adm-field" style={{ gridColumn: "1 / -1" }}><label>Opomba na računu (neobvezno)</label><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="adm-input" style={{ width: "100%" }} placeholder="npr. Po pogodbi z dne … / Hvala za sodelovanje!" /></div>
        </div>
        {err && <div className="adm-note err">{err}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="adm-btn" disabled={busy} onClick={() => openPdf({ action: "preview", ...body() }, `predogled-${kind}.pdf`)}>👁 Predogled PDF</button>
          {!edit && <button className="adm-btn" disabled={busy} onClick={saveDraft}>💾 Shrani osnutek</button>}
          {info && <span className="muted" style={{ alignSelf: "center" }}>{info}</span>}
          <div className="grow" />
          <button className="adm-btn" disabled={busy} onClick={() => issue(false)}>{edit ? "💾 Shrani spremembe" : <>🧾 Izdaj {DOC1[kind]}</>}</button>
          <button className="adm-btn pri" disabled={busy} onClick={() => issue(true)}>{edit ? "✉️ Shrani in pošlji po e-mailu" : "✉️ Izdaj in pošlji po e-mailu"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Osnutki dokumentov ---------- */
function DraftList({ current, onOpen, onNew }) {
  const [list, setList] = useState(null);
  const load = useCallback(() => getJSON("/api/admin/invoices?drafts=1").then((d) => setList(d?.drafts || [])), []);
  useEffect(() => { load(); }, [load]);
  if (!list || (!list.length && !current)) return null;
  async function del(d) {
    if (!confirm(`Izbrišem osnutek »${d.title}«? To ni izdan dokument, zato ga lahko brez skrbi izbrišeš.`)) return;
    await post("/api/admin/invoices", { action: "draft_delete", draft_id: d.id });
    if (String(d.id) === String(current)) onNew(); load();
  }
  return (
    <div className="adm-card" style={{ padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: list.length ? 8 : 0 }}>
        <b>📝 Osnutki ({list.length})</b><span className="muted">še niso izdani — lahko jih poljubno spreminjaš ali brišeš</span>
        <div className="grow" />{current && <button className="adm-btn" onClick={onNew}>+ Prazen nov vnos</button>}
      </div>
      {list.map((d) => (
        <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: String(d.id) === String(current) ? "#fff8e1" : "#f5f5f7", marginTop: 6, flexWrap: "wrap" }}>
          <span className="adm-tag">{({ racun: "Račun", predracun: "Predračun", dobavnica: "Dobavnica" })[d.kind] || d.kind}</span>
          <span className="strong">{d.title}</span><span className="muted">{eur(d.total_cents)} · {new Date(d.updated_at).toLocaleString("sl-SI", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <div className="grow" />
          {String(d.id) === String(current) ? <span className="muted">✏️ urejaš spodaj</span> : <button className="adm-btn" onClick={() => onOpen(d)}>✏️ Uredi</button>}
          <button className="adm-btn" onClick={() => del(d)}>🗑</button>
        </div>))}
    </div>
  );
}

/* ---------- Zaključi mesec (paket za računovodkinjo) ---------- */
function MonthClose({ onClose }) {
  const prev = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
  const [m, setM] = useState(prev);
  const [d, setD] = useState(null);
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { setD(null); getJSON(`/api/admin/month?m=${m}`).then((x) => { setD(x); if (x?.accountant_email) setTo((t) => t || x.accountant_email); }); }, [m]);
  const S = d?.summary;
  const label = new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
  async function sendIt() {
    if (!confirm(`Pošljem dokumente za ${label} na ${to}?`)) return;
    setBusy(true); setMsg({ ok: true, t: "Pripravljam PDF-je in pošiljam …" });
    const r = await post("/api/admin/month", { m, to, note });
    setBusy(false); setMsg({ ok: !!r?.ok, t: r?.message || "Napaka." });
    if (r?.ok) getJSON(`/api/admin/month?m=${m}`).then(setD);
  }
  return (
    <div className="adm-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560 }}>
        <div className="adm-mh"><h3>📦 Zaključi mesec</h3><button className="x" onClick={onClose}>✕</button></div>
        <div className="adm-mb">
          <div className="adm-field"><label>Mesec</label><input type="month" value={m} onChange={(e) => e.target.value && setM(e.target.value)} /></div>
          {!S ? <div className="adm-empty">Nalagam …</div> : (
            <div className="adm-note" style={{ lineHeight: 1.8 }}>
              <b>{label}</b>: {S.racuni} računov · {S.dobropisi} dobropisov · {S.prevzemi} prevzemov<br />
              Skupaj z DDV <b>{eur(S.total)}</b> · brez DDV {eur(S.net)} · DDV {eur(S.vat)}
              {S.log && <><br />✅ Že poslano {new Date(S.log.sent_at).toLocaleDateString("sl-SI")} na {S.log.to}</>}
            </div>)}
          <div className="muted" style={{ margin: "10px 0" }}>V paketu (ZIP): PDF vseh računov in dobropisov + Excel seznam z osnovami in DDV + prevzemi.</div>
          <div className="adm-field"><label>E-mail računovodkinje</label><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="racunovodstvo@…" /></div>
          <div className="adm-field"><label>Sporočilo (neobvezno)</label><textarea className="adm-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ width: "100%" }} /></div>
          {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <a className="adm-btn" href={`/api/admin/month?m=${m}&zip=1`}>⬇️ Prenesi ZIP</a>
            <div className="grow" />
            <button className="adm-btn pri" disabled={busy || !S || !(S.racuni + S.dobropisi + S.prevzemi)} onClick={sendIt}>✉️ Pošlji računovodkinji</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Davčno potrjevanje: potrdilo + poslovni prostor ---------- */
function FursSettings() {
  const [d, setD] = useState(null);
  const [file, setFile] = useState(null);
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState("");
  const [replace, setReplace] = useState(false);
  const [px, setPx] = useState("");
  const [f, setF] = useState(null);
  const load = useCallback(() => getJSON("/api/admin/furs").then((x) => { setD(x); setF(x?.settings || null); }), []);
  useEffect(() => { load(); }, [load]);
  async function upload() {
    setBusy("up"); setMsg(null);
    const fd = new FormData(); fd.append("file", file); fd.append("password", pass);
    const r = await fetch("/api/admin/furs", { method: "POST", body: fd }).then((x) => x.json()).catch(() => null);
    setBusy(""); setMsg({ ok: !!r?.ok, t: r?.message || "Napaka." });
    if (r?.ok) { setFile(null); setPass(""); setReplace(false); load(); }
  }
  async function act(body, label) {
    setBusy(label); setMsg(null);
    const r = await post("/api/admin/furs", body);
    setBusy(""); setMsg({ ok: !!r?.ok, t: r?.message || "Napaka." }); load();
    return r;
  }
  async function register() {
    const s = f || {};
    if (!confirm(`Prijavim poslovni prostor pri FURS?\n\nPoslovni prostor: ${s.premise} (spletna trgovina, tip C)\nRačuni: ${s.premise}-${s.dev_racun}-1, ${s.premise}-${s.dev_racun}-2 …\nDobropisi: ${s.premise}-${s.dev_dobropis}-1 …\nVelja od: danes\n\nPo prijavi se vsak izdan račun samodejno potrdi pri FURS. Oznak potem ni več mogoče spreminjati.`)) return;
    await act({ action: "register", settings: { premise: s.premise, dev_racun: s.dev_racun, dev_dobropis: s.dev_dobropis, operator: s.operator } }, "reg");
  }
  const c = d?.cert;
  const S = d?.settings || {};
  const reg = !!S.registered_at;
  const days = c ? Math.round((new Date(c.valid_to) - Date.now()) / 86400000) : 0;
  const setFv = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="adm-card" style={{ padding: 16, marginTop: 14 }}>
      <div className="strong" style={{ fontSize: 16, marginBottom: 4 }}>🔐 Davčno potrjevanje (FURS)</div>
      <div className="muted" style={{ marginBottom: 12 }}>Namensko digitalno potrdilo iz eDavkov (DPR-PrevzemDP → datoteka .p12). Shranjeno je šifrirano — ne pošiljaj ga nikomur.</div>
      {c && !replace ? (
        <div className="adm-note ok" style={{ lineHeight: 1.7 }}>
          ✅ Potrdilo naloženo: <b>{c.cn}</b> ({c.file})<br />
          Velja do <b>{new Date(c.valid_to).toLocaleDateString("sl-SI")}</b> ({days} dni) · naloženo {new Date(c.uploaded_at).toLocaleDateString("sl-SI")}
          <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="adm-btn" disabled={!!busy} onClick={() => act({ action: "echo" }, "echo")}>{busy === "echo" ? "Preverjam …" : "🔌 Preveri povezavo s FURS"}</button>
            <button className="adm-btn" onClick={() => setReplace(true)}>Zamenjaj potrdilo</button>
            {!reg && <button className="adm-btn" onClick={() => confirm("Odstranim potrdilo iz CMS?") && act({ action: "remove" }, "rm")}>Odstrani</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="adm-field" style={{ margin: 0 }}><label>Datoteka .p12</label><input type="file" accept=".p12,.pfx" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>
          <div className="adm-field" style={{ margin: 0 }}><label>Geslo potrdila</label><input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
          <button className="adm-btn pri" disabled={!file || !pass || !!busy} onClick={upload}>{busy === "up" ? "Preverjam …" : "⬆️ Naloži potrdilo"}</button>
          {replace && <button className="adm-btn" onClick={() => setReplace(false)}>Prekliči</button>}
        </div>
      )}
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`} style={{ marginTop: 10 }}>{msg.t}</div>}

      {c && (
        <div style={{ marginTop: 16, borderTop: "1px solid #e0e0e0", paddingTop: 14 }}>
          <div className="strong" style={{ marginBottom: 4 }}>🇸🇮 FURS posrednik (strežnik v Sloveniji)</div>
          <div className="muted" style={{ marginBottom: 8 }}>FURS sprejema samo zahteve s slovenskih IP naslovov. Posrednik samo preda šifrirano povezavo — vsebine ne vidi.</div>
          {d?.proxy ? (
            <div className="adm-note ok">✅ Posrednik: <b>{d.proxy.host}:{d.proxy.port}</b> · shranjen {new Date(d.proxy.saved_at).toLocaleDateString("sl-SI")}{" "}
              <button className="adm-btn" onClick={() => confirm("Odstranim posrednika?") && act({ action: "proxy", value: "" }, "px")}>Odstrani</button></div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="adm-field" style={{ margin: 0, flex: "1 1 360px" }}><label>Vrstica »furs://…« iz strežnika</label><input type="password" autoComplete="off" value={px} onChange={(e) => setPx(e.target.value)} placeholder="furs://…@…:8443" /></div>
              <button className="adm-btn pri" disabled={!px || !!busy} onClick={async () => { const r = await act({ action: "proxy", value: px }, "px"); if (r?.ok) setPx(""); }}>Shrani</button>
            </div>
          )}
        </div>
      )}

      {c && f && (
        <div style={{ marginTop: 16, borderTop: "1px solid #e0e0e0", paddingTop: 14 }}>
          <div className="strong" style={{ marginBottom: 8 }}>🏪 Poslovni prostor in številčenje</div>
          {reg ? (
            <div className="adm-note ok" style={{ lineHeight: 1.7 }}>
              ✅ Poslovni prostor <b>{S.premise}</b> prijavljen pri FURS {new Date(S.registered_at).toLocaleString("sl-SI")} (velja od {S.validity}).<br />
              Računi: <b>{S.premise}-{S.dev_racun}-1, -2 …</b> · Dobropisi: <b>{S.premise}-{S.dev_dobropis}-1 …</b><br />
              Potrjevanje: <b>{S.enabled ? "vklopljeno" : "IZKLOPLJENO"}</b>{" "}
              <button className="adm-btn" onClick={() => (S.enabled ? confirm("Izklopim pošiljanje računov na FURS? (Zakon zahteva potrjevanje gotovinskih računov!)") : true) && act({ settings: { enabled: !S.enabled } }, "en")}>{S.enabled ? "Izklopi" : "Vklopi"}</button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                <div className="adm-field" style={{ margin: 0 }}><label>Oznaka poslovnega prostora</label><input value={f.premise || ""} onChange={setFv("premise")} /></div>
                <div className="adm-field" style={{ margin: 0 }}><label>Naprava — računi</label><input value={f.dev_racun || ""} onChange={setFv("dev_racun")} /></div>
                <div className="adm-field" style={{ margin: 0 }}><label>Naprava — dobropisi</label><input value={f.dev_dobropis || ""} onChange={setFv("dev_dobropis")} /></div>
              </div>
              <div className="muted" style={{ margin: "8px 0" }}>Številke bodo: <b>{f.premise}-{f.dev_racun}-1</b>, {f.premise}-{f.dev_racun}-2 … in dobropisi <b>{f.premise}-{f.dev_dobropis}-1</b>. Oznaka je drugačna od Metakocke (»Slam-MK«), zato se ne prekriva.</div>
              <button className="adm-btn pri" disabled={!!busy} onClick={register}>{busy === "reg" ? "Prijavljam …" : "✅ Prijavi poslovni prostor in vklopi potrjevanje"}</button>
            </>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
            <b>Katere račune potrjujem</b>
            <div className="adm-seg">{[["vse", "Vse (kot v Metakocki)"], ["gotovina", "Kartica, gotovina, povzetje"], ["kartica", "Samo kartica + gotovina"]].map(([k, l]) =>
              <button key={k} className={S.mode === k ? "on" : ""} onClick={() => act({ settings: { mode: k } }, "mode")}>{l}</button>)}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
            <div className="adm-field" style={{ margin: 0 }}><label>Osebna davčna št. izdajatelja (neobvezno, za ročne račune)</label><input value={f.operator || ""} onChange={setFv("operator")} inputMode="numeric" placeholder="8 številk" /></div>
            <button className="adm-btn" onClick={() => act({ settings: { operator: f.operator || "" } }, "op")}>Shrani</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Dobropis k računu (delni ali celoten) ---------- */
function CreditModal({ inv, onClose, onDone }) {
  const [d, setD] = useState(null);
  const [qty, setQty] = useState({});
  const [back, setBack] = useState({});
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(inv.payment === "kartica" ? "kartica" : inv.payment === "gotovina" ? "gotovina" : "trr");
  const [send, setSend] = useState(!!inv.customer_email);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { getJSON(`/api/admin/invoices?credit=${inv.id}`).then(setD); }, [inv.id]);
  const items = d?.invoice?.items || [];
  const rest = d?.rest || [];
  const gross = !!d?.invoice?.prices_gross;
  const num = (v) => Math.max(0, Number(String(v ?? "").replace(",", ".")) || 0);
  const total = items.reduce((a, it, i) => {
    const q = Math.min(num(qty[i]), rest[i] || 0);
    const amt = q * (Number(it.price) || 0) * (1 - (Number(it.disc) || 0) / 100);
    return a + (gross ? amt : amt * (1 + (Number(it.vat) || 0) / 100));
  }, 0);
  const any = items.some((_, i) => num(qty[i]) > 0);
  async function go() {
    setBusy(true); setErr("");
    const lines = items.map((_, i) => ({ i, qty: num(qty[i]), restock: !!back[i] })).filter((l) => l.qty > 0);
    const r = await post("/api/admin/invoices", { action: "credit", id: inv.id, lines, reason, refund, send });
    setBusy(false);
    if (r?.ok) onDone({ ok: true, t: r.message }); else setErr(r?.message || "Napaka.");
  }
  return (
    <div className="adm-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal" style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 720 }}>
        <div className="adm-mh"><h3>↩️ Dobropis k računu {inv.number}</h3><button className="x" onClick={onClose}>✕</button></div>
        <div className="adm-mb">
          <div className="muted" style={{ marginBottom: 10 }}>{inv.customer_name}{inv.customer_email ? ` · ${inv.customer_email}` : ""} · račun {eur(inv.total_cents)}</div>
          {!d ? <div className="adm-empty">Nalagam …</div> : (
            <>
              <div className="adm-scroll" style={{ border: "1px solid #e0e0e0", borderRadius: 12 }}>
                <table className="adm-tbl">
                  <thead><tr><th>Postavka</th><th className="r">Na računu</th><th className="r">Še možno</th><th className="r">Vrača</th><th>Na zalogo?</th></tr></thead>
                  <tbody>{items.map((it, i) => (
                    <tr key={i} style={{ opacity: rest[i] > 0 ? 1 : 0.45 }}>
                      <td><div className="strong">{it.desc}</div>{it.code && <div className="muted">{it.code}</div>}</td>
                      <td className="r num">{it.qty}</td>
                      <td className="r num">{rest[i]}</td>
                      <td className="r">{rest[i] > 0 ? <input className="adm-input" style={{ width: 70, padding: "6px 8px", textAlign: "right" }} inputMode="decimal" value={qty[i] ?? ""} placeholder="0"
                        onChange={(e) => setQty((x) => ({ ...x, [i]: e.target.value }))} /> : "—"}</td>
                      <td>{rest[i] > 0 && it.code ? <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={!!back[i]} onChange={(e) => setBack((x) => ({ ...x, [i]: e.target.checked }))} /> vrni na zalogo</label> : <span className="muted">—</span>}</td>
                    </tr>))}</tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, margin: "10px 0 14px", flexWrap: "wrap" }}>
                <button className="adm-btn" onClick={() => setQty(Object.fromEntries(rest.map((r, i) => [i, r ? String(r) : ""])))}>Vse (celoten dobropis)</button>
                <button className="adm-btn" onClick={() => setQty({})}>Počisti</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="adm-field" style={{ gridColumn: "1 / -1" }}><label>Razlog (izpiše se na dobropisu)</label><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="npr. vračilo — prevelika velikost" /></div>
                <div className="adm-field"><label>Vračilo denarja</label>
                  <select value={refund} onChange={(e) => setRefund(e.target.value)}>
                    <option value="trr">Nakazilo na TRR kupca</option><option value="kartica">Na plačilno kartico</option><option value="gotovina">Gotovina</option>
                  </select></div>
                <div className="adm-field"><label>&nbsp;</label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={send} disabled={!inv.customer_email} onChange={(e) => setSend(e.target.checked)} /> pošlji dobropis kupcu po e-mailu</label></div>
              </div>
              {err && <div className="adm-note err" style={{ marginTop: 10 }}>{err}</div>}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                <div className="strong" style={{ fontSize: 18 }}>Za vračilo: {eur(Math.round(total * 100))}</div>
                <div className="grow" />
                <button className="adm-btn" onClick={onClose}>Prekliči</button>
                <button className="adm-btn pri" disabled={!any || busy} onClick={go}>{busy ? "Izdajam …" : "↩️ Izdaj dobropis"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Uvoz arhiva iz Metakocke ---------- */
function MkImport({ stats, onDone }) {
  const [files, setFiles] = useState({});
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (stats && !stats.n) setOpen(true); }, [stats]);
  async function run(action) {
    setBusy(true); setRes(action === "uvozi" ? { ...res, msg: "Uvažam … (do 1 minute)" } : { msg: "Preverjam datoteke …" });
    const fd = new FormData();
    for (const k of ["seznam", "podrobno", "nabava"]) if (files[k]) fd.append(k, files[k]);
    fd.append("action", action);
    const d = await fetch("/api/admin/mk-import", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ ok: false, message: "Povezava ni uspela." }));
    setBusy(false);
    setRes({ ...d, msg: d.message || (d.ok ? "" : "Napaka.") });
    if (action === "uvozi" && d.ok) onDone?.();
  }
  const S = res?.summary;
  const F = [["seznam", "1 · Seznam računov", "Prodaja → Računi → izvoz seznama (xlsx)"], ["podrobno", "2 · Računi podrobno (postavke)", "Poročila → Izpis prodajnih računov – podrobno (XLS)"], ["nabava", "3 · Nabavni računi podrobno", "Nabava → Poročila → nabavni računi – podrobno (dobavitelj PT Hartmattan)"]];
  return (
    <div className="adm-card" style={{ padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div><div className="strong">🗄️ Uvoz zgodovine iz Metakocke</div><div className="muted">Računi in dobropisi z originalnimi številkami (samo za branje), povezani s Shopify naročili. Nabava gre v Prevzeme — <b>zaloga se ne spremeni</b>.</div></div>
        <div className="grow" />
        <button className="adm-btn" onClick={() => setOpen(!open)}>{open ? "Skrij" : "Uvozi / posodobi"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            {F.map(([k, l, h]) => (
              <label key={k} className="adm-field" style={{ margin: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{l}</span>
                <input id={`mk-${k}`} type="file" accept=".xlsx,.xls" onChange={(e) => { setFiles((x) => ({ ...x, [k]: e.target.files?.[0] || null })); setRes(null); }} />
                <span className="muted" style={{ fontSize: 11.5 }}>{files[k] ? `✓ ${files[k].name}` : h}</span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="adm-btn" disabled={busy || (!files.seznam && !files.nabava)} onClick={() => run("preveri")}>🔍 Preveri (nič ne zapiše)</button>
            {S && res?.dry && <button className="adm-btn pri" disabled={busy} onClick={() => run("uvozi")}>✅ Uvozi v CMS</button>}
          </div>
          {res?.msg && <div className={`adm-note ${res.ok === false ? "err" : "ok"}`} style={{ marginTop: 12 }}>{res.msg}</div>}
          {S && (
            <div className="adm-note" style={{ marginTop: 12, lineHeight: 1.7 }}>
              {(S.racuni + S.dobropisi) > 0 && <>
                <b>{S.racuni}</b> računov + <b>{S.dobropisi}</b> dobropisov · skupaj <b>{eur(S.bruto)}</b><br />
                🔗 povezanih s Shopify naročili v CMS: <b>{S.shopify_v_bazi}</b> · starejši Shopify (naročila niso v CMS): <b>{S.shopify_ni_v_bazi}</b> · ostali (osebno, Instagram, B2B, tujina): <b>{S.ostali}</b><br />
                📦 postavk: <b>{S.postavk}</b>{S.brez_postavk ? <> · ⚠️ brez postavk: <b>{S.brez_postavk}</b> {res?.has && !res.has.podrobno ? "(dodaj datoteko 2)" : "(uvozijo se z enim zneskom)"}</> : null}{S.razlika ? <> · razlika v zaokroževanju pri {S.razlika}</> : null}<br />
                📊 V »Čisti RVC« štejejo računi, ki niso povezani z naročilom v CMS, in dobropisi.<br />
              </>}
              {S.prevzemi > 0 && <>🚚 Prevzemi: <b>{S.prevzemi}</b> nabavnih računov · <b>{S.prevzemi_kosov}</b> kosov · <b>{eur(S.prevzemi_vrednost)}</b> brez DDV (zaloga ostane, kot je)</>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InvoiceSettings() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { getJSON("/api/admin/invoices?settings=1").then((d) => setS(d?.settings || {})); }, []);
  if (!s) return <div className="adm-card adm-empty">Nalagam …</div>;
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  async function save() { const d = await post("/api/admin/invoices", { action: "settings", settings: s }); setMsg({ ok: !!d?.ok, t: d?.message || "Napaka." }); if (d?.settings) setS(d.settings); }
  const sample = { action: "preview", customer: { name: "Primer kupca d.o.o.", address: "Slovenska cesta 1", zip_city: "1000 Ljubljana", vat: "SI12345678" },
    items: [{ desc: "Storitev ali artikel", qty: 1, unit: "kos", price: 100, disc: 0, vat: 22 }], gross: false, payment: "trr", notes: "" };
  return (
    <div className="adm-card" style={{ padding: 18 }}>
      {msg && <div className={`adm-note ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
      <div className="inv-grid">
        <div className="adm-field"><label>Barva (glava tabele, črte)</label><div style={{ display: "flex", gap: 8 }}><input type="color" value={s.accent} onChange={set("accent")} style={{ width: 54, padding: 2 }} /><input value={s.accent} onChange={set("accent")} /></div></div>
        <div className="adm-field"><label>Prva številka v letu</label><input value={s.start} onChange={set("start")} inputMode="numeric" /></div>
        <div className="adm-field"><label>Privzeti rok plačila (dni)</label><input value={s.due_days} onChange={set("due_days")} inputMode="numeric" /></div>
        <div className="adm-field"><label>Kraj izdaje</label><input value={s.place} onChange={set("place")} /></div>
        <div className="adm-field"><label>Račun pripravil/a</label><input value={s.prepared_by} onChange={set("prepared_by")} /></div>
        <div className="adm-field"><label>E-mail na računu</label><input value={s.email} onChange={set("email")} /></div>
        <div className="adm-field"><label>Spletna stran</label><input value={s.web} onChange={set("web")} /></div>
        <div className="adm-field" style={{ alignSelf: "end" }}><label className="adm-check"><input type="checkbox" checked={s.show_logo !== false} onChange={set("show_logo")} /> Logotip Freestyle Freak</label></div>
        <div className="adm-field" style={{ gridColumn: "1 / -1" }}><label>Opomba na vsakem računu (neobvezno)</label><textarea className="adm-input" style={{ width: "100%" }} rows={2} value={s.note} onChange={set("note")} /></div>
        <div className="adm-field" style={{ gridColumn: "1 / -1" }}><label>Besedilo v nogi</label><textarea className="adm-input" style={{ width: "100%" }} rows={2} value={s.footer} onChange={set("footer")} /></div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="adm-btn pri" onClick={save}>💾 Shrani</button>
        <button className="adm-btn" onClick={() => openPdf(sample)}>👁 Predogled oblike</button>
      </div>
    </div>
  );
}
