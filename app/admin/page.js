"use client";
import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
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
const STD = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const sortSizes = (list) => {
  const rank = (x) => { const i = STD.indexOf(x); if (i > -1) return i; const n = parseInt(x, 10); return Number.isFinite(n) ? 100 + n : 1000; };
  return [...list].sort((a, b) => rank(a) - rank(b) || String(a).localeCompare(String(b)));
};
const GROUP_LABEL = { boksarice: "Boksarice", kopalke: "Kopalke", oblacila: "Oblačila", obutev: "Obutev", dodatki: "Dodatki", perilo: "Spodnje perilo" };
const GENDER_LABEL = { moski: "Moški", zenske: "Ženske", otroci: "Otroci" };
const groupKey = (p) => (p.gender === "moski" ? p.group : p.gender);
const GROUP_ORDER = ["boksarice", "kopalke", "oblacila", "obutev", "dodatki", "zenske", "otroci"];
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
  return bad ? <span className="wm">69SLAM</span> : <img ref={ref} src="/logo.png" alt="69SLAM" onError={() => setBad(true)} />;
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

  const newCount = (orders || []).filter((o) => o.status === "novo").length;
  const lowCount = (stock || []).filter((p) => Object.values(p.sizes).some((v) => v.stock > 0 && v.stock <= 2)).length;

  function go(v) { setView(v); setMenu(false); window.scrollTo(0, 0); }
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/prijava";
  }
  async function setStatus(id, status) {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await Promise.all([loadOrders(), loadStock()]);
  }

  const NAV = [
    { id: "dashboard", ico: "📊", lbl: "Dashboard" },
    { id: "narocila", ico: "📦", lbl: "Naročila", bdg: newCount || null },
    { id: "zaloga", ico: "👕", lbl: "Zaloga" },
    { id: "inventura", ico: "📋", lbl: "Inventura" },
    { id: "stranke", ico: "👤", lbl: "Stranke" },
    { id: "nastavitve", ico: "⚙️", lbl: "Nastavitve", soon: true },
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
          {NAV.map((n) => (
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
        {view === "dashboard" && <Dashboard onOpenOrder={(id) => { setOpenOrder(id); }} goOrders={() => go("narocila")} />}
        {view === "narocila" && <Orders orders={orders} onOpen={setOpenOrder} />}
        {view === "zaloga" && <Stock stock={stock} reload={loadStock} />}
        {view === "inventura" && <Inventory stock={stock} reload={loadStock} />}
        {view === "stranke" && <Customers reloadOrders={loadOrders} />}
      </main>

      {orderObj && <OrderPanel o={orderObj} onClose={() => setOpenOrder(null)} setStatus={setStatus} />}
    </div>
  );
}

/* =========================== DASHBOARD =========================== */
function Dashboard({ onOpenOrder, goOrders }) {
  const [days, setDays] = useState(30);
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    getJSON(`/api/admin/dashboard?days=${days}`).then((x) => setD(x || { ok: false }));
  }, [days]);

  const s = d?.stats;
  const chg = (v) =>
    v === null || v === undefined ? <span>ni podatkov za primerjavo</span> :
    <><span className={v >= 0 ? "up" : "down"}>{v >= 0 ? "▲" : "▼"} {Math.abs(v)} %</span> vs prejšnjih {days} dni</>;

  return (
    <>
      <div className="adm-top">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Pregled prodaje · zadnjih {days} dni (preklicana naročila niso šteta)</div>
        </div>
        <div className="grow" />
        <div className="adm-seg">
          {[7, 30, 90].map((n) => (
            <button key={n} className={days === n ? "on" : ""} onClick={() => setDays(n)}>{n} dni</button>
          ))}
        </div>
      </div>

      <div className="adm-stats">
        <div className="adm-card adm-stat">
          <div className="k">Prihodek</div>
          <div className="v">{s ? eur(s.revenue) : "…"}</div>
          <div className="d">{s ? chg(s.revenueChange) : " "}</div>
        </div>
        <div className="adm-card adm-stat">
          <div className="k">Naročila</div>
          <div className="v">{s ? s.orders : "…"}</div>
          <div className="d">{s ? chg(s.ordersChange) : " "}</div>
        </div>
        <div className="adm-card adm-stat">
          <div className="k">Povprečna košarica</div>
          <div className="v">{s ? eur(s.aov) : "…"}</div>
          <div className="d">na naročilo</div>
        </div>
        <div className="adm-card adm-stat">
          <div className="k">Vračajoče stranke</div>
          <div className="v">{s ? `${s.returningPct} %` : "…"}</div>
          <div className="d">{s ? `od ${s.buyers} kupcev v obdobju` : " "}</div>
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-card">
          <div className="adm-card-h"><h3>Prodaja po dnevih</h3></div>
          {d?.series ? <BarChart series={d.series} /> : <div className="adm-empty">Nalagam …</div>}
        </div>
        <div className="adm-card">
          <div className="adm-card-h"><h3>Top 5 printov</h3><span className="sub" style={{ fontSize: 12, color: "var(--a-muted)" }}>prodani kosi</span></div>
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
              {!d ? <tr><td colSpan={5} className="adm-empty">Nalagam …</td></tr> :
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
  const [f, setF] = useState("vsa");
  const [q, setQ] = useState("");
  const counts = useMemo(() => {
    const c = { vsa: (orders || []).length };
    for (const s of STATUSES) c[s] = (orders || []).filter((o) => o.status === s).length;
    return c;
  }, [orders]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (orders || []).filter((o) =>
      (f === "vsa" || o.status === f) &&
      (!t || `${o.number} ${o.name} ${o.email} ${o.city}`.toLowerCase().includes(t)));
  }, [orders, f, q]);

  return (
    <>
      <div className="adm-top">
        <div><h1>Naročila</h1><div className="sub">Klikni naročilo za podrobnosti in spremembo statusa.</div></div>
      </div>
      <div className="adm-bar">
        <div className="adm-chips">
          {["vsa", ...STATUSES].map((s) => (
            <button key={s} className={f === s ? "on" : ""} onClick={() => setF(s)}>
              {s === "vsa" ? "Vsa" : SLABEL[s]} <span className="c">{counts[s] || 0}</span>
            </button>
          ))}
        </div>
        <div className="adm-search"><input placeholder="Išči: št., ime, e-mail …" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="adm-card adm-scroll">
        <table className="adm-tbl">
          <thead><tr><th>Št.</th><th>Datum</th><th>Kupec</th><th>Plačilo</th><th>Status</th><th className="r">Znesek</th></tr></thead>
          <tbody>
            {orders === null ? <tr><td colSpan={6} className="adm-empty">Nalagam …</td></tr> :
             !list.length ? <tr><td colSpan={6} className="adm-empty">{orders.length ? "Ni zadetkov." : "Še ni naročil. Ko kupec odda naročilo, se pojavi tukaj."}</td></tr> :
             list.map((o) => (
              <tr key={o.id} className="click" onClick={() => onOpen(o.id)}>
                <td className="strong">{onum(o)}</td>
                <td className="muted">{dt(o.created_at)}</td>
                <td>{o.name}<div className="muted">{o.email}</div></td>
                <td>{PAY[o.payment] || o.payment}</td>
                <td><Pill s={o.status} /></td>
                <td className="r strong num">{eur(o.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrderPanel({ o, onClose, setStatus }) {
  const [busy, setBusy] = useState(false);
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
    setBusy(true); await setStatus(o.id, s); setBusy(false);
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
          <div className="adm-sec" style={{ marginTop: 0 }}>Spremeni status</div>
          <div className="adm-status">
            {STATUSES.map((s) => (
              <button key={s} disabled={busy} className={o.status === s ? "on" : ""} onClick={() => change(s)}>{SLABEL[s]}</button>
            ))}
          </div>

          <div className="adm-sec">Kupec in dostava</div>
          <dl className="adm-dl">
            <dt>Ime</dt><dd><b>{o.name}</b></dd>
            <dt>E-mail</dt><dd><a href={`mailto:${o.email}`} style={{ color: "var(--a-blue)" }}>{o.email}</a></dd>
            {o.phone && <><dt>Telefon</dt><dd>{o.phone}</dd></>}
            <dt>Naslov</dt><dd>{o.address}<br />{o.zip} {o.city}{o.country && o.country !== "SI" ? `, ${o.country}` : ""}</dd>
            <dt>Plačilo</dt><dd>{PAY[o.payment] || o.payment}</dd>
            {o.source === "shopify" && <><dt>Izvor</dt><dd><span className="adm-tag">uvoz iz Shopifyja</span></dd></>}
          </dl>

          <div className="adm-sec">Postavke</div>
          <div className="adm-items">
            {items.length ? items.map((it, i) => (
              <div className="row" key={i}>
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

/* =========================== ZALOGA =========================== */
function Stock({ stock, reload }) {
  const [f, setF] = useState("vsi");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null); // { p, size }
  const [msg, setMsg] = useState(null);
  const [seeding, setSeeding] = useState(false);

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
          <h1>Zaloga</h1>
          <div className="sub">{stock ? `${stock.length} printov · ${totals} kosov skupaj` : "Nalagam …"} · klikni številko za popravek</div>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Thumb src={p.img} sm />
                    <div>
                      <div className="strong">{p.name}</div>
                      <div className="muted">{p.code}{p.type ? ` · ${p.type}` : ""}{p.collection === "limited" ? " · limited" : ""}{!p.active ? " · neaktiven" : ""}</div>
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
      {edit && <StockModal p={edit.p} size={edit.size} onClose={() => setEdit(null)}
        onSaved={async (t) => { setEdit(null); setMsg({ ok: true, t }); await reload(); }} />}
    </>
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
  const [f, setF] = useState("vse");
  const [imp, setImp] = useState(null); // { running, done, imported, msg, ok }

  const load = useCallback(async () => {
    const d = await getJSON("/api/admin/customers");
    setList(d?.customers || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function runImport() {
    if (!confirm("Uvozim zgodovino naročil in strank iz Shopifyja? Zaloga se NE spremeni, podvojitev ni (lahko ponoviš).")) return;
    let cursor = null, total = 0, subs = 0, pages = 0;
    setImp({ running: true, imported: 0 });
    while (true) {
      const d = await getJSON("/api/admin/import-shopify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cursor }) });
      if (!d?.ok) {
        setImp({ running: false, ok: false, setup: d?.setup, msg: d?.message || "Napaka pri uvozu." });
        break;
      }
      total += d.imported; subs += d.subscribers || 0; pages++;
      setImp({ running: true, imported: total });
      if (!d.hasMore || pages > 400) {
        setImp({ running: false, ok: true, msg: `✓ Uvoz končan: ${total} novih naročil, ${subs} novih naročnikov na novice.` });
        break;
      }
      cursor = d.cursor;
    }
    await Promise.all([load(), reloadOrders()]);
  }

  const counts = useMemo(() => ({
    vse: (list || []).length,
    ret: (list || []).filter((c) => c.orders >= 2).length,
    sub: (list || []).filter((c) => c.subscribed).length,
  }), [list]);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list || []).filter((c) =>
      (f === "vse" || (f === "ret" && c.orders >= 2) || (f === "sub" && c.subscribed)) &&
      (!t || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(t)));
  }, [list, q, f]);

  return (
    <>
      <div className="adm-top">
        <div><h1>Stranke</h1><div className="sub">Zbrano iz naročil po e-mailu · ↺ vračajoča = 2 ali več naročil</div></div>
        <div className="grow" />
        <button className="adm-btn" onClick={runImport} disabled={imp?.running}>
          {imp?.running ? `Uvažam … (${imp.imported})` : "⬇ Uvozi iz Shopifyja"}
        </button>
      </div>
      {imp && !imp.running && (
        <div className={`adm-note ${imp.ok ? "ok" : imp.setup ? "" : "err"}`}>
          {imp.msg}
          {imp.setup && <> Navodila za nastavitev ti pripravi Claude — reci mu »nastavi Shopify uvoz«.</>}
        </div>
      )}
      <div className="adm-bar">
        <div className="adm-chips">
          {[["vse", "Vse"], ["ret", "↺ Vračajoče"], ["sub", "Prijavljeni na novice"]].map(([k, l]) => (
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
             !shown.length ? <tr><td colSpan={5} className="adm-empty">{list.length ? "Ni zadetkov." : "Še ni strank — pojavijo se ob prvem naročilu ali po uvozu iz Shopifyja."}</td></tr> :
             shown.map((c) => (
              <tr key={c.email}>
                <td>
                  <span className="strong">{c.name}</span>{" "}
                  {c.orders >= 2 && <span className="adm-tag ret">↺ vračajoča</span>}
                  <div className="muted">{c.email}{c.city && c.city !== "-" ? ` · ${c.city}` : ""}</div>
                </td>
                <td className="r num strong">{c.orders}</td>
                <td className="r num strong">{eur(c.total_cents)}</td>
                <td className="muted">{dShort(c.last_order)}</td>
                <td>{c.subscribed ? <span className="adm-tag sub">✓ prijavljen</span> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
