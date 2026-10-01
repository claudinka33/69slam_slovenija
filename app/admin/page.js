"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
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
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
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
    { id: "zaloga", ico: "👕", lbl: "Zaloga", bdg: lowCount || null, warn: true },
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
    { id: "boks", lbl: "Boksarice", fn: (p) => p.category === "boksarice" },
    { id: "kop", lbl: "Kopalke", fn: (p) => p.category === "kopalke" },
  ];
  const list = useMemo(() => {
    const fn = FILTERS.find((x) => x.id === f).fn;
    const t = q.trim().toLowerCase();
    return (stock || []).filter((p) => fn(p) && (!t || `${p.name} ${p.code}`.toLowerCase().includes(t) ||
      Object.values(p.sizes).some((v) => v.sku.toLowerCase().includes(t))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock, f, q]);
  const totals = useMemo(() => (stock || []).reduce((a, p) => a + p.total, 0), [stock]);

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
              {SIZES.map((s) => <th key={s} className="sz">{s}</th>)}
              <th className="sz">Skupaj</th>
            </tr>
          </thead>
          <tbody>
            {stock === null ? <tr><td colSpan={8} className="adm-empty">Nalagam …</td></tr> :
             !stock.length ? <tr><td colSpan={8} className="adm-empty">Baza je prazna — klikni »Uvozi katalog v bazo« zgoraj.</td></tr> :
             !list.length ? <tr><td colSpan={8} className="adm-empty">Ni zadetkov.</td></tr> :
             list.map((p) => (
              <tr key={p.code}>
                <td style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Thumb src={p.img} sm />
                    <div>
                      <div className="strong">{p.name}</div>
                      <div className="muted">{p.code}{p.collection === "limited" ? " · limited" : ""}{!p.active ? " · neaktiven" : ""}</div>
                    </div>
                  </div>
                </td>
                {SIZES.map((s) => {
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
