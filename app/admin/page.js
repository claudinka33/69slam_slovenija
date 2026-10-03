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
  async function setStatus(id, status, tracking) {
    await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, tracking }) });
    await Promise.all([loadOrders(), loadStock()]);
  }

  const NAV = [
    { id: "dashboard", ico: "📊", lbl: "Dashboard" },
    { id: "narocila", ico: "📦", lbl: "Naročila", bdg: newCount || null },
    { id: "zaloga", ico: "👕", lbl: "Artikli" },
    { id: "prevzemi", ico: "📥", lbl: "Prevzemi" },
    { id: "inventura", ico: "📋", lbl: "Inventura" },
    { id: "cenik", ico: "💶", lbl: "Cenik & RVC" },
    { id: "kode", ico: "🏷️", lbl: "Kode za popust" },
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
        {view === "prevzemi" && <Receipts stock={stock} reloadStock={loadStock} />}
        {view === "cenik" && <PriceList />}
        {view === "kode" && <Coupons />}
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
function Coupons() {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const load = useCallback(async () => { const d = await getJSON("/api/admin/coupons"); setList(d?.coupons || []); }, []);
  useEffect(() => { load(); }, [load]);
  const blank = { code: "", percent: "20", starts: "", ends: "", min_order: "", max_uses: "", once: false, active: true, note: "" };
  function edit(c) {
    setForm({ id: c.id, code: c.code, percent: String(c.percent), starts: isoDay(c.starts_at), ends: isoDay(c.expires_at),
      min_order: c.min_order_cents ? (c.min_order_cents / 100).toString().replace(".", ",") : "", max_uses: c.max_uses ? String(c.max_uses) : "",
      once: c.once_per_email, active: c.active, note: c.note || "" });
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
        min_order: c.min_order_cents ? c.min_order_cents / 100 : "", max_uses: c.max_uses || "", once: c.once_per_email, active: !c.active, note: c.note }) });
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
                <td className="muted">{[c.min_order_cents ? `nad ${eur(c.min_order_cents)}` : null, c.once_per_email ? "1× na kupca" : null, c.max_uses ? `največ ${c.max_uses}×` : null].filter(Boolean).join(" · ") || "—"}</td>
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
