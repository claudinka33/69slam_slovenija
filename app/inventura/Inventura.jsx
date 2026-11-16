"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./inventura.css";

/* Inventura za tablico — vsak vnos se takoj shrani na tablico IN v bazo.
   Zaloge ne spreminja: razlike potrdi Claudia v adminu → Inventura. */

const K_ART = "inv69-articles";
const K_ENT = "inv69-entries";
const K_UI = "inv69-ui";
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

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
  const [ui, setUi] = useState({ q: "", kind: "all", show: "stock", tab: "list", open: null });
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pad, setPad] = useState(null); // { sku, code, size, name, stock, cid?, val }
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

  const groups = useMemo(() => {
    const m = {};
    for (const a of articles) {
      const g = (m[a.code] = m[a.code] || { code: a.code, name: a.name, type: a.type, kind: a.kind, img: a.img, sizes: [], stock: 0 });
      g.sizes.push(a);
      g.stock += a.stock;
    }
    const list = Object.values(m);
    for (const g of list) {
      g.sizes.sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
      g.hay = fold(`${g.code} ${g.name} ${g.type} ${g.sizes.map((s) => s.sku).join(" ")}`);
    }
    // vrstni red skupin: moški → ženske → otroci → ostalo, znotraj tega največje skupine najprej
    const size = {};
    for (const g of list) size[g.kind] = (size[g.kind] || 0) + 1;
    list.sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || size[b.kind] - size[a.kind] || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
    return list;
  }, [articles]);
  const groupByCode = useMemo(() => Object.fromEntries(groups.map((g) => [g.code, g])), [groups]);
  const skuInfo = useMemo(() => Object.fromEntries(articles.map((a) => [a.sku, a])), [articles]);

  const counted = (g) => g.sizes.some((s) => bySku[s.sku]?.length);
  const kinds = useMemo(() => {
    const m = {};
    for (const g of groups) if (ui.show !== "stock" || g.stock > 0 || counted(g)) m[g.kind] = (m[g.kind] || 0) + 1;
    return Object.entries(m); // že v vrstnem redu skupin
  }, [groups, ui.show, bySku]); // eslint-disable-line

  const tokens = fold(ui.q).split(/\s+/).filter(Boolean);
  const shown = groups.filter((g) => {
    if (tokens.length) return tokens.every((t) => g.hay.includes(t)); // iskanje vedno po celotni bazi
    if (ui.kind !== "all" && g.kind !== ui.kind) return false;
    if (ui.show === "stock" && !(g.stock > 0 || counted(g))) return false;
    if (ui.show === "todo" && counted(g)) return false;
    if (ui.show === "done" && !counted(g)) return false;
    return true;
  });

  const scope = groups.filter((g) => (ui.kind === "all" || g.kind === ui.kind) && (g.stock > 0 || counted(g)));
  const doneN = scope.filter(counted).length;
  const pieces = live.reduce((a, e) => a + e.qty, 0);
  const manualN = live.filter((e) => e.manual).length;

  /* ---------- obnovi pozicijo seznama ---------- */
  const restored = useRef(false);
  useEffect(() => {
    if (auth !== true || restored.current || !groups.length) return;
    restored.current = true;
    const y = load(K_UI, {}).y || 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [auth, groups.length]);
  useEffect(() => {
    let t;
    const f = () => { clearTimeout(t); t = setTimeout(() => save(K_UI, { ...load(K_UI, {}), y: window.scrollY }), 200); };
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  /* ---------- vnosi ---------- */
  function putEntry(e) {
    verRef.current += 1;
    setEntries((cur) => ({ ...cur, [e.cid]: { ...cur[e.cid], ...e, synced: false, v: verRef.current } }));
  }
  function addCount(a, qty) {
    putEntry({ cid: uid(), sku: a.sku, code: a.code, size: a.size, qty, manual: false, note: null, deleted: false, at: new Date().toISOString() });
    if (navigator.vibrate) navigator.vibrate(30);
    flash(`✓ Dodano ${qty} × ${a.name} · ${a.size}`);
  }
  function editCount(cid, qty) {
    putEntry({ cid, qty });
    flash("✓ Popravljeno");
  }
  function delEntry(cid) {
    if (!window.confirm("Izbrišem ta vnos?")) return;
    putEntry({ cid, deleted: true });
    flash("Vnos izbrisan");
  }

  if (auth === null) return <div className="tb"><div className="tb-center"><div className="tb-spin" /></div></div>;
  if (auth === false) return <Login onOk={() => { setAuth(null); loadAll(); }} />;

  const openG = ui.open ? groupByCode[ui.open] : null;
  const setQ = (q) => { setUi((u) => ({ ...u, q })); window.scrollTo(0, 0); };

  return (
    <div className="tb">
      <div className="tb-sticky">
      <header className="tb-top">
        <div className="tb-brand"><b>69SLAM</b> INVENTURA</div>
        <div className="tb-stats">
          <span><b>{doneN}</b> / {scope.length} artiklov</span>
          <span><b>{pieces}</b> kosov</span>
          {manualN > 0 && <span className="tb-y">❓ {manualN} za pregled</span>}
        </div>
        <div className={`tb-sync ${!online ? "off" : pendingCount ? "wait" : "ok"}`}>
          {!online ? `📴 Ni interneta — ${pendingCount} shranjenih na tablici` : pendingCount || syncing ? "⏳ Shranjujem …" : "✓ Vse shranjeno"}
        </div>
      </header>
      <div className="tb-prog"><i style={{ width: `${scope.length ? (doneN / scope.length) * 100 : 0}%` }} /></div>
      {ui.tab === "list" && (
        <div className="tb-searchbar">
          <div className="tb-search">
            <span>🔍</span>
            <input value={ui.q} onChange={(e) => setQ(e.target.value)} placeholder="Išči po šifri ali nazivu …"
              autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
            {ui.q && <button onClick={() => setQ("")} aria-label="Počisti">✕</button>}
          </div>
        </div>
      )}
      </div>

      <div className="tb-tabs">
        <button className={ui.tab === "list" ? "on" : ""} onClick={() => setUi((u) => ({ ...u, tab: "list" }))}>📦 Artikli</button>
        <button className={ui.tab === "log" ? "on" : ""} onClick={() => setUi((u) => ({ ...u, tab: "log" }))}>🕘 Moji vnosi ({live.length})</button>
      </div>

      {ui.tab === "list" ? (
        <>
          <div className="tb-filters">
            {!tokens.length && (
              <>
                <div className="tb-chips">
                  <button className={ui.kind === "all" ? "on" : ""} onClick={() => setUi((u) => ({ ...u, kind: "all" }))}>Vse</button>
                  {kinds.map(([k, n]) => (
                    <button key={k} className={ui.kind === k ? "on" : ""} onClick={() => { setUi((u) => ({ ...u, kind: k })); window.scrollTo(0, 0); }}>
                      {k} <small>{n}</small>
                    </button>
                  ))}
                </div>
                <div className="tb-seg">
                  {[["stock", "Z zalogo"], ["todo", "Še ne prešteto"], ["done", "Prešteto"], ["all", "Vsi artikli"]].map(([k, l]) => (
                    <button key={k} className={ui.show === k ? "on" : ""} onClick={() => setUi((u) => ({ ...u, show: k }))}>{l}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="tb-list">
            {!articles.length && <div className="tb-empty">Nalagam artikle …</div>}
            {articles.length > 0 && !shown.length && (
              <div className="tb-empty">
                {tokens.length ? <>Za »{ui.q}« ni artikla.</> : "Ni artiklov za ta izbor."}
              </div>
            )}
            {shown.slice(0, 400).map((g) => {
              const any = counted(g);
              return (
                <button key={g.code} className={`tb-card${any ? " done" : ""}`} onClick={() => setUi((u) => ({ ...u, open: g.code }))}>
                  <Img src={g.img} />
                  <div className="tb-cmain">
                    <div className="tb-ctype">{g.type || g.kind}</div>
                    <div className="tb-cname">{g.name}</div>
                    <div className="tb-ccode">{g.code}</div>
                    <div className="tb-sizes">
                      {g.sizes.map((s) => {
                        const c = (bySku[s.sku] || []).reduce((a, e) => a + e.qty, 0);
                        const has = bySku[s.sku]?.length;
                        return (
                          <span key={s.sku} className={has ? "c" : ""}>
                            <b>{s.size}</b> {has ? c : "–"}<em>/{s.stock}</em>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="tb-go">{any ? "✓" : "›"}</div>
                </button>
              );
            })}
            {shown.length > 400 && <div className="tb-empty">Prikazanih prvih 400 — zoži iskanje ali izberi skupino.</div>}
            <button className="tb-unknown" onClick={() => setManual({ sku: ui.q.trim().toUpperCase(), size: "", qty: "", note: "" })}>
              ➕ Artikla ni na seznamu — vpiši ročno
            </button>
          </div>
        </>
      ) : (
        <Log live={live} skuInfo={skuInfo} groupByCode={groupByCode}
          onEdit={(e) => {
            const a = skuInfo[e.sku];
            if (e.manual || !a) setManual({ cid: e.cid, sku: e.sku, size: e.size || "", qty: String(e.qty), note: e.note || "" });
            else setPad({ ...a, cid: e.cid, val: String(e.qty) });
          }}
          onDel={delEntry} />
      )}

      {openG && (
        <Sheet g={openG} bySku={bySku} onClose={() => setUi((u) => ({ ...u, open: null }))}
          onAdd={(s) => setPad({ ...s, name: openG.name, val: "" })}
          onEdit={(s, e) => setPad({ ...s, name: openG.name, cid: e.cid, val: String(e.qty) })} />
      )}

      {pad && (
        <Pad pad={pad} total={(bySku[pad.sku] || []).reduce((a, e) => a + e.qty, 0)} onClose={() => setPad(null)}
          onSave={(n) => { if (pad.cid) editCount(pad.cid, n); else addCount(pad, n); setPad(null); }}
          onDelete={pad.cid ? () => { delEntry(pad.cid); setPad(null); } : null} />
      )}

      {manual && (
        <Manual m={manual} onClose={() => setManual(null)}
          onDelete={manual.cid ? () => { delEntry(manual.cid); setManual(null); } : null}
          onSave={(m) => {
            const known = skuInfo[m.sku];
            putEntry({
              cid: m.cid || uid(), sku: m.sku, code: known?.code || null, size: m.size || known?.size || null,
              qty: m.qty, manual: !known, note: m.note || null, deleted: false, at: new Date().toISOString(),
            });
            flash(known ? `✓ Šifra obstaja — dodano k ${known.name} · ${known.size}` : "✓ Shranjeno za pregled");
            setManual(null);
          }} />
      )}

      {toast && <div className="tb-toast">{toast}</div>}
    </div>
  );
}

/* ---------- sličica ---------- */
function Img({ src }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className="tb-img none">69</div>;
  return <img className="tb-img" src={src} alt="" loading="lazy" onError={() => setBad(true)} />;
}

/* ---------- prijava s PIN-om ---------- */
function Login({ onOk }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(p = pin) {
    if (p.length < 4 || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/inventura", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", pin: p }) });
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
    <div className="tb tb-login">
      <div className="tb-lbox">
        <div className="tb-brand big"><b>69SLAM</b> INVENTURA</div>
        <p>Vpiši PIN kodo</p>
        <div className="tb-dots">{Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <i key={i} className={i < pin.length ? "on" : ""} />)}</div>
        {err && <div className="tb-err">{err}</div>}
        <div className="tb-keys">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0"].map((k) => <button key={k} onClick={() => key(k)}>{k}</button>)}
          <button className="ok" disabled={pin.length < 4 || busy} onClick={() => go()}>{busy ? "…" : "VSTOPI"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- artikel: vse velikosti ---------- */
function Sheet({ g, bySku, onClose, onAdd, onEdit }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="tb-ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tb-sheet">
        <div className="tb-shead">
          <Img src={g.img} />
          <div>
            <div className="tb-ctype">{g.type || g.kind}</div>
            <h2>{g.name}</h2>
            <div className="tb-ccode">{g.code}</div>
          </div>
          <button className="tb-x" onClick={onClose}>✕</button>
        </div>
        <div className="tb-srows">
          {g.sizes.map((s) => {
            const list = bySku[s.sku] || [];
            const sum = list.reduce((a, e) => a + e.qty, 0);
            const diff = sum - s.stock;
            return (
              <div key={s.sku} className={`tb-srow${list.length ? " done" : ""}`}>
                <div className="tb-sz">{s.size}</div>
                <div className="tb-snum">
                  <div><small>V sistemu</small><b>{s.stock}</b></div>
                  <div><small>Prešteto</small><b>{list.length ? sum : "–"}</b></div>
                  {list.length > 0 && <div className={`tb-diff ${diff > 0 ? "p" : diff < 0 ? "m" : "z"}`}>{diff === 0 ? "✓" : diff > 0 ? `+${diff}` : diff}</div>}
                </div>
                <div className="tb-ents">
                  {list.map((e) => <button key={e.cid} onClick={() => onEdit(s, e)}>{e.qty} <span>✎</span></button>)}
                </div>
                <button className="tb-add" onClick={() => onAdd(s)}>＋ VPIŠI</button>
              </div>
            );
          })}
        </div>
        <button className="tb-done" onClick={onClose}>KONČANO</button>
      </div>
    </div>
  );
}

/* ---------- številčnica ---------- */
function Pad({ pad, total, onClose, onSave, onDelete }) {
  const [v, setV] = useState(pad.val || "");
  const n = parseInt(v, 10);
  const ok = Number.isFinite(n) && n >= 0 && v !== "";
  const key = (k) => {
    if (k === "⌫") return setV((x) => x.slice(0, -1));
    if (k === "C") return setV("");
    setV((x) => (x === "0" ? k : (x + k).slice(0, 5)));
  };
  const plus = (d) => setV((x) => String((parseInt(x, 10) || 0) + d));
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
  return (
    <div className="tb-ov top" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tb-pad">
        <div className="tb-phead">
          <div>
            <b>{pad.name}</b>
            <span>Velikost <b>{pad.size}</b> · {pad.sku}</span>
            <span>V sistemu: <b>{pad.stock}</b>{!pad.cid && total > 0 ? <> · že prešteto: <b>{total}</b> (prišteje se)</> : null}</span>
          </div>
          <button className="tb-x" onClick={onClose}>✕</button>
        </div>
        <div className="tb-val">{v || <em>0</em>}<small>kosov</small></div>
        <div className="tb-plus">
          {[1, 5, 10].map((d) => <button key={d} onClick={() => plus(d)}>+{d}</button>)}
        </div>
        <div className="tb-keys">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((k) => <button key={k} onClick={() => key(k)}>{k}</button>)}
        </div>
        <button className="tb-save" disabled={!ok} onClick={() => onSave(n)}>{pad.cid ? "SHRANI POPRAVEK" : `DODAJ ${ok ? n : ""}`}</button>
        {onDelete && <button className="tb-delb" onClick={onDelete}>🗑 Izbriši ta vnos</button>}
      </div>
    </div>
  );
}

/* ---------- ročni vnos (artikla ni na seznamu) ---------- */
function Manual({ m, onClose, onSave, onDelete }) {
  const [sku, setSku] = useState(m.sku || "");
  const [size, setSize] = useState(m.size || "");
  const [qty, setQty] = useState(m.qty || "");
  const [note, setNote] = useState(m.note || "");
  const n = parseInt(qty, 10);
  const ok = sku.trim().length >= 2 && Number.isFinite(n) && n >= 0;
  return (
    <div className="tb-ov top" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tb-pad tb-man">
        <div className="tb-phead">
          <div><b>Artikla ni na seznamu</b><span>Vpiši šifro s kosa in količino — Claudia bo pregledala.</span></div>
          <button className="tb-x" onClick={onClose}>✕</button>
        </div>
        <label>Šifra artikla
          <input value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="npr. MBYCDR-M" autoFocus />
        </label>
        <label>Velikost</label>
        <div className="tb-szpick">
          {["", ...SIZES].map((s) => <button key={s || "x"} className={size === s ? "on" : ""} onClick={() => setSize(s)}>{s || "brez"}</button>)}
        </div>
        <label>Količina
          <input value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" pattern="[0-9]*" placeholder="0" />
        </label>
        <label>Opomba (neobvezno)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="npr. ime na etiketi, barva …" />
        </label>
        <button className="tb-save" disabled={!ok} onClick={() => onSave({ cid: m.cid, sku: sku.trim(), size, qty: n, note: note.trim() })}>SHRANI</button>
        {onDelete && <button className="tb-delb" onClick={onDelete}>🗑 Izbriši ta vnos</button>}
      </div>
    </div>
  );
}

/* ---------- zadnji vnosi ---------- */
function Log({ live, skuInfo, onEdit, onDel }) {
  const list = [...live].sort((a, b) => new Date(b.at) - new Date(a.at));
  if (!list.length) return <div className="tb-list"><div className="tb-empty">Še ni vnosov. Začni na zavihku »Artikli«.</div></div>;
  return (
    <div className="tb-list">
      {list.map((e) => {
        const a = skuInfo[e.sku];
        return (
          <div key={e.cid} className={`tb-log${e.manual ? " man" : ""}`}>
            <div className="tb-ltime">{hhmm(e.at)}{!e.synced && <span title="Čaka na internet"> ⏳</span>}</div>
            <div className="tb-lmain" onClick={() => onEdit(e)}>
              <b>{e.manual ? `❓ ${e.sku}` : a ? a.name : e.sku}</b>
              <span>{e.manual ? `ročni vnos · za pregled${e.size ? ` · ${e.size}` : ""}${e.note ? ` · ${e.note}` : ""}` : `${e.sku}${a ? ` · ${a.size}` : ""}`}</span>
            </div>
            <div className="tb-lqty" onClick={() => onEdit(e)}>{e.qty}</div>
            <button className="tb-ldel" onClick={() => onDel(e.cid)}>🗑</button>
          </div>
        );
      })}
    </div>
  );
}
