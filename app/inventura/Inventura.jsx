"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./inventura.css";
import { LOGO_WHITE } from "../../lib/brand";

/* Inventura za tablico — vsak vnos se takoj shrani na tablico IN v bazo.
   Zaloge ne spreminja: razlike potrdi Claudia v adminu → Inventura. */

const K_ART = "inv69-articles";
const K_ENT = "inv69-entries";
const K_UI = "inv69-ui";
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const QUICK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const sizeRank = (x) => { const i = SIZES.indexOf(x); if (i > -1) return i; const n = parseInt(x, 10); return Number.isFinite(n) ? 100 + n : 1000; };
const kindRank = (k) => (/^Moš/.test(k) ? 0 : /^Žen/.test(k) ? 1 : /^Otro/.test(k) ? 2 : /^Unisex/.test(k) ? 3 : 4);
const hhmm = (d) => new Date(d).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });

export default function Inventura() {
  const [auth, setAuth] = useState(null); // null = nalagam, false = PIN, true = notri
  const [articles, setArticles] = useState([]);
  const [entries, setEntries] = useState({}); // cid → vnos
  const [ui, setUi] = useState({ q: "", kind: "all", show: "stock", tab: "list", view: "vzorec", size: "all" });
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pad, setPad] = useState(null); // { sku, code, size, name, stock, cid?, val }
  const [menu, setMenu] = useState(false);
  const [manual, setManual] = useState(null);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);
  const entRef = useRef(entries);
  entRef.current = entries;
  const verRef = useRef(0);

  /* ---------- obnovi stanje s tablice ---------- */
  useEffect(() => {
    setArticles(load(K_ART, { list: [] }).list || []);
    setEntries(load(K_ENT, {}));
    setUi((u) => ({ ...u, ...load(K_UI, {}) }));
    setOnline(navigator.onLine);
    setReady(true);
  }, []);
  useEffect(() => { if (ready) save(K_ENT, entries); }, [entries, ready]);
  useEffect(() => { if (ready) save(K_UI, ui); }, [ui, ready]);

  const flash = (t) => { setToast(t); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(null), 1800); };

  /* ---------- strežnik ---------- */
  const mergeServer = useCallback((server, sentVers) => {
    setEntries((cur) => {
      const next = {};
      for (const s of server) next[s.cid] = { ...s, at: s.created_at, synced: true };
      for (const [cid, e] of Object.entries(cur)) {
        const sent = sentVers?.[cid];
        if (!e.synced && !(sent !== undefined && sent === e.v)) next[cid] = e; // še ni poslano ali spremenjeno medtem
      }
      return next;
    });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const r = await fetch("/api/inventura", { cache: "no-store" });
      const d = await r.json();
      if (r.status === 401) { setAuth(false); return; }
      if (!d.ok) throw new Error();
      setArticles(d.articles);
      save(K_ART, { list: d.articles, at: Date.now() });
      mergeServer(d.entries);
      setAuth(true);
      setOnline(true);
    } catch {
      setOnline(false);
      // brez interneta: delaj naprej s podatki, shranjenimi na tablici
      setAuth(load(K_ART, { list: [] }).list?.length ? true : false);
    }
  }, [mergeServer]);

  const sync = useCallback(async () => {
    const pending = Object.values(entRef.current).filter((e) => !e.synced);
    setSyncing(true);
    const sentVers = Object.fromEntries(pending.map((e) => [e.cid, e.v]));
    try {
      const r = await fetch("/api/inventura", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", entries: pending }),
      });
      if (r.status === 401) { setAuth(false); return; }
      const d = await r.json();
      if (!d.ok) throw new Error();
      mergeServer(d.entries, sentVers);
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setSyncing(false);
    }
  }, [mergeServer]);

  useEffect(() => { if (ready) loadAll(); }, [ready, loadAll]);

  // pošiljanje: takoj po spremembi, vsakih 15 s, ob vrnitvi na stran in ko je spet internet
  const pendingCount = Object.values(entries).filter((e) => !e.synced).length;
  useEffect(() => {
    if (auth !== true || !pendingCount) return;
    const t = setTimeout(sync, 250);
    return () => clearTimeout(t);
  }, [pendingCount, auth, sync, entries]);
  useEffect(() => {
    if (auth !== true) return;
    let lastArt = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastArt > 10 * 60000) { lastArt = Date.now(); loadAll(); } else sync();
    };
    const iv = setInterval(tick, 15000);
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("focus", tick);
    };
  }, [auth, sync, loadAll]);

  /* ---------- izračuni ---------- */
  const live = useMemo(() => Object.values(entries).filter((e) => !e.deleted), [entries]);
  const bySku = useMemo(() => {
    const m = {};
    for (const e of live) if (!e.manual) (m[e.sku] = m[e.sku] || []).push(e);
    for (const k in m) m[k].sort((a, b) => new Date(a.at) - new Date(b.at));
    return m;
  }, [live]);
  const sumOf = (sku) => (bySku[sku] || []).reduce((a, e) => a + e.qty, 0);

  // ena vrstica = ena velikost (SKU); vrstni red: moški → ženske → otroci → ostalo, večje skupine najprej
  const rows = useMemo(() => {
    const cnt = {};
    const codes = {};
    for (const a of articles) if (!codes[a.code]) { codes[a.code] = 1; cnt[a.kind] = (cnt[a.kind] || 0) + 1; }
    const list = articles.map((a) => ({ ...a, hay: fold(`${a.sku} ${a.code} ${a.name} ${a.type}`) }));
    const byKind = (a, b) => kindRank(a.kind) - kindRank(b.kind) || cnt[b.kind] - cnt[a.kind] || a.kind.localeCompare(b.kind);
    if (ui.view === "velikost") {
      // po velikosti: vse L skupaj, znotraj tega po šifri (MBY…, MCY…) — kot je v škatli
      list.sort((a, b) => byKind(a, b) || sizeRank(a.size) - sizeRank(b.size) || String(a.size).localeCompare(String(b.size))
        || a.code.slice(0, 3).localeCompare(b.code.slice(0, 3)) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
    } else {
      list.sort((a, b) => byKind(a, b) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code) || sizeRank(a.size) - sizeRank(b.size));
    }
    return list;
  }, [articles, ui.view]);
  const sizeList = useMemo(() => {
    const m = new Set();
    for (const a of articles) if (a.size && (ui.kind === "all" || a.kind === ui.kind)) m.add(a.size);
    return [...m].sort((a, b) => sizeRank(a) - sizeRank(b) || String(a).localeCompare(String(b)));
  }, [articles, ui.kind]);
  const skuInfo = useMemo(() => Object.fromEntries(articles.map((a) => [a.sku, a])), [articles]);

  const isDone = (r) => Boolean(bySku[r.sku]?.length);
  const inStockScope = (r) => r.stock > 0 || isDone(r);
  const kinds = useMemo(() => {
    const m = {};
    for (const r of rows) {
      if (!inStockScope(r)) continue;
      const k = (m[r.kind] = m[r.kind] || { n: 0, d: 0 });
      k.n++; if (isDone(r)) k.d++;
    }
    return Object.entries(m);
  }, [rows, bySku]); // eslint-disable-line

  const tokens = fold(ui.q).split(/\s+/).filter(Boolean);
  const bySize = ui.view === "velikost";
  const shown = rows.filter((r) => {
    if (bySize && ui.size !== "all" && r.size !== ui.size) return false;
    if (tokens.length) return tokens.every((t) => r.hay.includes(t)); // iskanje vedno po celotni bazi
    if (ui.kind !== "all" && r.kind !== ui.kind) return false;
    if (ui.show === "stock") return inStockScope(r);
    if (ui.show === "todo") return !isDone(r) && r.stock > 0;
    if (ui.show === "done") return isDone(r);
    return true;
  });

  const scope = rows.filter(inStockScope);
  const doneN = scope.filter(isDone).length;
  const pieces = live.reduce((a, e) => a + e.qty, 0);
  const manualN = live.filter((e) => e.manual).length;
  const diffN = scope.filter((r) => isDone(r) && sumOf(r.sku) !== r.stock).length;

  /* ---------- obnovi pozicijo seznama ---------- */
  const restored = useRef(false);
  const scrollRef = useRef(null);
  useEffect(() => {
    if (auth !== true || restored.current || !rows.length || !scrollRef.current) return;
    restored.current = true;
    const y = load(K_UI, {}).y || 0;
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = y; });
  }, [auth, rows.length]);
  const onScroll = (e) => {
    const y = e.currentTarget.scrollTop;
    clearTimeout(onScroll._t);
    onScroll._t = setTimeout(() => save(K_UI, { ...load(K_UI, {}), y }), 200);
  };

  /* ---------- vnosi ---------- */
  function putEntry(e) {
    verRef.current += 1;
    setEntries((cur) => ({ ...cur, [e.cid]: { ...cur[e.cid], ...e, synced: false, v: verRef.current } }));
  }
  function addCount(a, qty) {
    putEntry({ cid: uid(), sku: a.sku, code: a.code, size: a.size, qty, manual: false, note: null, deleted: false, at: new Date().toISOString() });
    if (navigator.vibrate) navigator.vibrate(30);
    flash(`✓ +${qty} · ${a.sku}`);
  }
  function editCount(cid, qty) { putEntry({ cid, qty }); flash("✓ Popravljeno"); }
  function delEntry(cid) {
    if (!window.confirm("Izbrišem ta vnos?")) return false;
    putEntry({ cid, deleted: true });
    flash("Vnos izbrisan");
    return true;
  }

  if (auth === null) return <div className="iv iv-center"><div className="iv-spin" /></div>;
  if (auth === false) return <Login onOk={() => { setAuth(null); loadAll(); }} />;

  const setQ = (q) => { setUi((u) => ({ ...u, q, tab: "list" })); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const pickKind = (k) => { setUi((u) => ({ ...u, kind: k, q: "", tab: "list" })); setMenu(false); if (scrollRef.current) scrollRef.current.scrollTop = 0; };
  const pct = scope.length ? (doneN / scope.length) * 100 : 0;

  return (
    <div className="iv">
      {/* ---------- stranski meni ---------- */}
      <aside className={`iv-side${menu ? " open" : ""}`}>
        <div className="iv-brand">
          <img src={LOGO_WHITE} alt="69SLAM" />
          <small>INVENTURA · SKLADIŠČE</small>
        </div>
        <nav className="iv-nav">
          <button className={ui.kind === "all" && ui.tab === "list" ? "on" : ""} onClick={() => pickKind("all")}>
            <span className="lbl">Vse skupine</span><span className="cnt">{doneN}/{scope.length}</span>
          </button>
          <div className="iv-sep" />
          {kinds.map(([k, v]) => (
            <button key={k} className={ui.kind === k && ui.tab === "list" ? "on" : ""} onClick={() => pickKind(k)}>
              <span className="lbl">{k}</span>
              <span className={`cnt${v.d === v.n ? " full" : ""}`}>{v.d}/{v.n}</span>
            </button>
          ))}
        </nav>
        <div className="iv-sidefoot">
          <div className="iv-meter"><i style={{ width: `${pct}%` }} /></div>
          <div className="iv-kpis">
            <div><small>Prešteto</small><b>{doneN}<span style={{ fontSize: 12, opacity: 0.55 }}> / {scope.length}</span></b></div>
            <div><small>Kosov</small><b>{pieces}</b></div>
          </div>
        </div>
      </aside>
      {menu && <div className="iv-scrim" onClick={() => setMenu(false)} />}

      {/* ---------- glavni del ---------- */}
      <main className="iv-main">
        <div className="iv-top">
          <button className="iv-burger" onClick={() => setMenu(true)} aria-label="Skupine">☰ <span>Skupine</span></button>
          <div className="iv-title">
            <h1>{ui.tab === "log" ? "Moji vnosi" : ui.kind === "all" ? "Inventura" : ui.kind}</h1>
            <div className="sub">Vnosi se shranjujejo sproti · zaloga se spremeni šele ob potrditvi v adminu</div>
          </div>
          <div className={`iv-sync ${!online ? "off" : pendingCount || syncing ? "wait" : "ok"}`}>
            <i />{!online ? `Brez povezave · ${pendingCount} na tablici` : pendingCount || syncing ? "Shranjujem …" : "Vse shranjeno"}
          </div>
        </div>

        <div className="iv-kpirow">
          <div className="iv-kpi"><small>Preštete velikosti</small><b>{doneN}<span> / {scope.length}</span></b></div>
          <div className="iv-kpi"><small>Preštetih kosov</small><b>{pieces}</b></div>
          <div className="iv-kpi"><small>Z razliko</small><b className={diffN ? "red" : ""}>{diffN}</b></div>
          <div className="iv-kpi"><small>Ročni vnosi</small><b className={manualN ? "orange" : ""}>{manualN}</b></div>
        </div>

        <div className="iv-bar">
          <div className="iv-search">
            <span>⌕</span>
            <input value={ui.q} onChange={(e) => setQ(e.target.value)} placeholder="Išči po šifri ali nazivu …"
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
            {ui.q && <button onClick={() => setQ("")} aria-label="Počisti">✕</button>}
          </div>
          <div className="iv-seg">
            {[["stock", "Z zalogo"], ["todo", "Neprešteto"], ["done", "Prešteto"], ["all", "Vse"]].map(([k, l]) => (
              <button key={k} className={ui.tab === "list" && ui.show === k ? "on" : ""} onClick={() => setUi((u) => ({ ...u, show: k, tab: "list" }))}>{l}</button>
            ))}
            <button className={ui.tab === "log" ? "on" : ""} onClick={() => setUi((u) => ({ ...u, tab: "log" }))}>Moji vnosi · {live.length}</button>
          </div>
          <button className="iv-btn pri" onClick={() => setManual({ sku: ui.q.trim().toUpperCase(), size: "", qty: "", note: "" })}>＋ Ročni vnos</button>
        </div>
        {ui.tab === "list" && (
          <div className="iv-bar">
            <div className="iv-seg iv-view">
              <button className={!bySize ? "on" : ""} onClick={() => setUi((u) => ({ ...u, view: "vzorec", size: "all" }))}>👕 Po vzorcu</button>
              <button className={bySize ? "on" : ""} onClick={() => setUi((u) => ({ ...u, view: "velikost" }))}>📏 Po velikosti</button>
            </div>
            {bySize && (
              <div className="iv-sizes">
                <button className={ui.size === "all" ? "on" : ""} onClick={() => setUi((u) => ({ ...u, size: "all" }))}>Vse</button>
                {sizeList.map((z) => (
                  <button key={z} className={ui.size === z ? "on" : ""} onClick={() => { setUi((u) => ({ ...u, size: z })); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}>{z}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="iv-card" ref={scrollRef} onScroll={onScroll}>
          {ui.tab === "list" ? (
            <table className="iv-tbl">
              <colgroup><col /><col style={{ width: 84 }} /><col style={{ width: 92 }} /><col style={{ width: 112 }} /><col style={{ width: 96 }} /></colgroup>
              <thead>
                <tr><th>Artikel · šifra</th><th className="c">Vel.</th><th className="r">Sistem</th><th className="r">Prešteto</th><th className="r">Razl.</th></tr>
              </thead>
              <tbody>
                {!articles.length ? <tr><td colSpan={5} className="iv-empty">Nalagam artikle …</td></tr> :
                 !shown.length ? (
                  <tr><td colSpan={5} className="iv-empty">
                    {tokens.length ? <>Za »{ui.q}« ni artikla. <button className="iv-link" onClick={() => setManual({ sku: ui.q.trim().toUpperCase(), size: "", qty: "", note: "" })}>Vpiši ročno →</button></> : "Ni artiklov za ta izbor."}
                  </td></tr>
                 ) : shown.slice(0, 600).map((r, i) => {
                  const done = isDone(r);
                  const sum = sumOf(r.sku);
                  const diff = sum - r.stock;
                  const gk = (x) => (bySize ? `${x.kind} · ${x.size}` : x.kind);
                  const head = (bySize || (!tokens.length && ui.kind === "all")) && (i === 0 || gk(shown[i - 1]) !== gk(r));
                  const same = !bySize && i > 0 && shown[i - 1].code === r.code;
                  return (
                    <Fragment key={r.sku}>
                      {head && <tr className="iv-grp"><td colSpan={5}>{gk(r)}</td></tr>}
                      <tr className={`${done ? (diff ? "diff" : "ok") : ""}${same ? " same" : ""}`} onClick={() => setPad({ ...r, val: "" })}>
                        <td>
                          {same ? <div className="iv-cont"><span>↳</span><span className="mono">{r.sku}</span></div> : (
                            <div className="iv-art">
                              <Img src={r.img} />
                              <div>
                                <div className="nm">{r.name}</div>
                                <div className="ty">{r.type || r.kind}</div>
                                <div className="mono">{r.sku}</div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="c"><span className="iv-size">{r.size}</span></td>
                        <td className="r num">{r.stock}</td>
                        <td className="r num strong">{done ? <>{sum}{bySku[r.sku].length > 1 && <small> ({bySku[r.sku].length}×)</small>}</> : <span className="dash">—</span>}</td>
                        <td className="r num">
                          {done ? <span className={`iv-pill ${diff > 0 ? "g" : diff < 0 ? "r" : "ok"}`}>{diff === 0 ? "✓" : diff > 0 ? `+${diff}` : diff}</span> : null}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <Log live={live} skuInfo={skuInfo}
              onEdit={(e) => {
                const a = skuInfo[e.sku];
                if (e.manual || !a) setManual({ cid: e.cid, sku: e.sku, size: e.size || "", qty: String(e.qty), note: e.note || "" });
                else setPad({ ...a, cid: e.cid, val: String(e.qty) });
              }}
              onDel={delEntry} />
          )}
          {ui.tab === "list" && shown.length > 600 && <div className="iv-empty">Prikazanih prvih 600 vrstic — izberi skupino ali zoži iskanje.</div>}
        </div>
      </main>

      {pad && (
        <Pad pad={pad} entries={bySku[pad.sku] || []} onClose={() => setPad(null)}
          onSave={(n) => { if (pad.cid) editCount(pad.cid, n); else addCount(pad, n); setPad(null); }}
          onPick={(e) => setPad({ ...pad, cid: e.cid, val: String(e.qty) })}
          onDelete={pad.cid ? () => { if (delEntry(pad.cid)) setPad(null); } : null} />
      )}

      {manual && (
        <Manual m={manual} onClose={() => setManual(null)}
          onDelete={manual.cid ? () => { if (delEntry(manual.cid)) setManual(null); } : null}
          onSave={(m) => {
            const known = skuInfo[m.sku];
            putEntry({
              cid: m.cid || uid(), sku: m.sku, code: known?.code || null, size: m.size || known?.size || null,
              qty: m.qty, manual: !known, note: m.note || null, deleted: false, at: new Date().toISOString(),
            });
            flash(known ? `✓ Šifra obstaja — prišteto k ${known.sku}` : "✓ Shranjeno za pregled");
            setManual(null);
          }} />
      )}

      {toast && <div className="iv-toast">{toast}</div>}
    </div>
  );
}

/* ---------- sličica ---------- */
function Img({ src }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className="iv-thumb none" />;
  return <img className="iv-thumb" src={src} alt="" loading="lazy" onError={() => setBad(true)} />;
}

/* ---------- prijava s PIN-om ---------- */
function Login({ onOk }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    if (pin.length < 4 || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/inventura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", pin }) });
      const d = await r.json();
      if (d.ok) onOk();
      else { setErr(d.message || "Napačen PIN."); setPin(""); }
    } catch { setErr("Ni povezave z internetom."); }
    setBusy(false);
  }
  const key = (k) => {
    setErr("");
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length < 8 ? p + k : p));
  };
  return (
    <div className="iv iv-login">
      <div className="iv-lbox">
        <div className="iv-lhead"><img src={LOGO_WHITE} alt="69SLAM" /><small>INVENTURA · SKLADIŠČE</small></div>
        <div className="iv-lbody">
          <div className="iv-label">Vpiši PIN kodo</div>
          <div className="iv-dots">{Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <i key={i} className={i < pin.length ? "on" : ""} />)}</div>
          {err && <div className="iv-err">{err}</div>}
          <div className="iv-keys">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((k) => <button key={k} onClick={() => key(k)}>{k}</button>)}
            <button className="ok" disabled={pin.length < 4 || busy} onClick={go}>{busy ? "…" : "Vstopi"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- številčnica ---------- */
function Pad({ pad, entries, onClose, onSave, onPick, onDelete }) {
  const [v, setV] = useState(pad.val || "");
  useEffect(() => setV(pad.val || ""), [pad.cid, pad.val]);
  const n = parseInt(v, 10);
  const ok = Number.isFinite(n) && n >= 0 && v !== "";
  const total = entries.reduce((a, e) => a + e.qty, 0);
  const key = (k) => {
    if (k === "⌫") return setV((x) => x.slice(0, -1));
    if (k === "C") return setV("");
    setV((x) => (x === "0" ? k : (x + k).slice(0, 5)));
  };
  useEffect(() => {
    const kd = (e) => {
      if (/^\d$/.test(e.key)) key(e.key);
      else if (e.key === "Backspace") key("⌫");
      else if (e.key === "Enter" && ok) onSave(n);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  });
  const after = pad.cid ? total - (entries.find((e) => e.cid === pad.cid)?.qty || 0) + (ok ? n : 0) : total + (ok ? n : 0);
  return (
    <div className="iv-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="iv-modal">
        <div className="iv-mh">
          <div>
            <h3>{pad.name} · <span className="iv-size">{pad.size}</span></h3>
            <div className="sub mono">{pad.sku}{pad.type ? ` · ${pad.type}` : ""}</div>
          </div>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="iv-mb">
          <div className="iv-stats3">
            <div><small>V sistemu</small><b>{pad.stock}</b></div>
            <div><small>Prešteto doslej</small><b>{entries.length ? total : "—"}</b></div>
            <div><small>Po vnosu</small><b className={after - pad.stock > 0 ? "green" : after - pad.stock < 0 ? "red" : ""}>{after}</b></div>
          </div>
          {entries.length > 0 && (
            <div className="iv-ents">
              <small>Vnosi:</small>
              {entries.map((e) => (
                <button key={e.cid} className={pad.cid === e.cid ? "on" : ""} onClick={() => onPick(e)}>{e.qty}<span> · {hhmm(e.at)}</span></button>
              ))}
            </div>
          )}
          <div className="iv-qlabel">{pad.cid ? "Tapni pravilno količino — takoj shrani" : "Tapni količino — takoj shrani"}</div>
          <div className="iv-quick">
            {QUICK.map((d) => <button key={d} onClick={() => onSave(d)}>{d}</button>)}
          </div>
          <div className="iv-qlabel">Več kot 10? Vpiši in potrdi:</div>
          <div className="iv-val"><span>{pad.cid ? "Popravi vnos" : "Dodaj kosov"}</span><b>{v || <em>0</em>}</b></div>
          <div className="iv-keys">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => <button key={k} onClick={() => key(k)}>{k}</button>)}
          </div>
        </div>
        <div className="iv-mf">
          {onDelete ? <button className="iv-btn danger" onClick={onDelete}>Izbriši vnos</button> : <span />}
          <button className="iv-btn pri lg" disabled={!ok} onClick={() => onSave(n)}>{pad.cid ? "Shrani popravek" : `Dodaj ${ok ? n : ""}`}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ročni vnos (artikla ni na seznamu) ---------- */
function Manual({ m, onClose, onSave, onDelete }) {
  const [sku, setSku] = useState(m.sku || "");
  const [size, setSize] = useState(m.size || "");
  const [other, setOther] = useState(m.size && !SIZES.includes(m.size) ? m.size : "");
  const [qty, setQty] = useState(m.qty || "");
  const [note, setNote] = useState(m.note || "");
  const n = parseInt(qty, 10);
  const ok = sku.trim().length >= 2 && Number.isFinite(n) && n >= 0;
  return (
    <div className="iv-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="iv-modal">
        <div className="iv-mh">
          <div><h3>Ročni vnos</h3><div className="sub">Artikla ni na seznamu — vpiši šifro s kosa. Claudia bo pregledala.</div></div>
          <button className="x" onClick={onClose}>✕</button>
        </div>
        <div className="iv-mb iv-form">
          <label>Šifra artikla
            <input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="npr. MBYCDR-M" autoFocus />
          </label>
          <label>Velikost</label>
          <div className="iv-szpick">
            {["", ...SIZES].map((s) => <button key={s || "x"} className={size === s && !other ? "on" : ""} onClick={() => { setSize(s); setOther(""); }}>{s || "brez"}</button>)}
            <input className={`iv-other${other ? " on" : ""}`} value={other} placeholder="Druga velikost (npr. 42, 40-41, 32)"
              onChange={(e) => { const x = e.target.value.toUpperCase().slice(0, 20); setOther(x); setSize(x); }}
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          </div>
          <label>Količina</label>
          <div className="iv-quick sm">
            {QUICK.map((d) => <button key={d} className={qty === String(d) ? "on" : ""} onClick={() => setQty(String(d))}>{d}</button>)}
          </div>
          <input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" pattern="[0-9]*" placeholder="ali vpiši več kot 10" />
          <label>Opomba (neobvezno)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. ime na etiketi, barva …" />
          </label>
        </div>
        <div className="iv-mf">
          {onDelete ? <button className="iv-btn danger" onClick={onDelete}>Izbriši vnos</button> : <span />}
          <button className="iv-btn pri lg" disabled={!ok} onClick={() => onSave({ cid: m.cid, sku: sku.trim(), size, qty: n, note: note.trim() })}>Shrani</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- zadnji vnosi ---------- */
function Log({ live, skuInfo, onEdit, onDel }) {
  const list = [...live].sort((a, b) => new Date(b.at) - new Date(a.at));
  return (
    <table className="iv-tbl">
      <colgroup><col style={{ width: 92 }} /><col /><col style={{ width: 84 }} /><col style={{ width: 80 }} /><col style={{ width: 76 }} /></colgroup>
      <thead><tr><th>Čas</th><th>Artikel · šifra</th><th className="c">Vel.</th><th className="r">Kos</th><th /></tr></thead>
      <tbody>
        {!list.length ? <tr><td colSpan={5} className="iv-empty">Še ni vnosov.</td></tr> : list.map((e) => {
          const a = skuInfo[e.sku];
          return (
            <tr key={e.cid} className={e.manual ? "man" : ""} onClick={() => onEdit(e)}>
              <td className="muted num">{hhmm(e.at)}</td>
              <td>
                <div className="nm">{e.manual ? "Ročni vnos" : a ? a.name : "—"}</div>
                <div className="mono">{e.sku}</div>
                {e.note && <div className="ty">{e.note}</div>}
                <div className="iv-st">
                  {e.manual ? <span className="iv-pill o">Za pregled</span> : null}
                  {e.synced ? <span className="iv-pill ok">Shranjeno</span> : <span className="iv-pill w">Čaka internet</span>}
                </div>
              </td>
              <td className="c">{(a?.size || e.size) ? <span className="iv-size">{a?.size || e.size}</span> : "—"}</td>
              <td className="r num strong">{e.qty}</td>
              <td className="r"><button className="iv-icon" onClick={(ev) => { ev.stopPropagation(); onDel(e.cid); }} aria-label="Izbriši">🗑</button></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
