import { db } from "./db";

const eur = (c) => (Number(c || 0) / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2 }) + " €";
const codeOf = (sku) => String(sku || "").replace(/-[^-]+$/, "");

/** Cena in ime artikla za dodajanje v naročilo (trenutna prodajna cena s popusti iz kataloga). */
export async function articleForOrder(sku) {
  const sql = db();
  const [v] = await sql`SELECT v.sku, v.code, v.size, v.stock, p.name, p.price_cents, p.cost_cents
    FROM variants v JOIN products p ON p.code = v.code WHERE v.sku = ${sku}`;
  if (!v) return null;
  let name = v.name, cents = v.price_cents;
  try {
    const c = await import("./catalog");
    await c.primeCatalog();
    const p = c.getAnyProduct(v.code);
    if (p) { name = p.name || name; if (p.effPrice) cents = Math.round(Number(p.effPrice) * 100); }
  } catch {}
  return { sku: v.sku, code: v.code, size: v.size, stock: v.stock, name, price_cents: cents, cost_cents: v.cost_cents ?? null };
}

/**
 * Uredi postavke spletnega naročila (dokler ni poslano in račun ni izdan).
 * lines: [{ id?, sku, qty, price_cents }] — id = obstoječa postavka, brez id = nova.
 * Zaloga: odstranjeno se vrne, dodano se odšteje (kot ob oddaji naročila).
 */
export async function editOrderItems(orderId, lines, shippingCents) {
  const sql = db();
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) return { ok: false, message: "Naročilo ne obstaja." };
  if (o.source === "shopify") return { ok: false, message: "Uvoženih Shopify naročil se ne ureja." };
  if (!["novo", "placano"].includes(o.status))
    return { ok: false, message: "Naročilo je že poslano ali zaprto — urejanje ni več mogoče. Uporabi dobropis." };
  const [inv] = await sql`SELECT number FROM invoices WHERE order_id = ${orderId} AND kind = 'racun' AND status <> 'storniran' LIMIT 1`;
  if (inv) return { ok: false, message: `Račun ${inv.number} je že izdan (potrjen pri FURS), zato naročila ni več mogoče spremeniti. Uporabi dobropis.` };

  if (!Array.isArray(lines)) return { ok: false, message: "Manjkajo postavke." };
  const clean = [];
  for (const l of lines) {
    const qty = Math.round(Number(l.qty) || 0);
    const price = Math.round(Number(l.price_cents));
    if (!l.sku || qty < 1 || qty > 50) return { ok: false, message: `Neveljavna količina pri ${l.sku || "postavki"}.` };
    if (!Number.isFinite(price) || price < 0 || price > 100000) return { ok: false, message: `Neveljavna cena pri ${l.sku}.` };
    clean.push({ id: l.id ? Number(l.id) : null, sku: String(l.sku), qty, price_cents: price });
  }
  if (!clean.length) return { ok: false, message: "Naročilo mora imeti vsaj eno postavko. Če ga kupec ne želi več, ga prekliči." };

  const old = await sql`SELECT * FROM order_items WHERE order_id = ${orderId} ORDER BY id`;
  const oldById = Object.fromEntries(old.map((r) => [Number(r.id), r]));

  // količine po SKU prej / potem → premik zaloge
  const before = {}, after = {};
  for (const r of old) before[r.sku] = (before[r.sku] || 0) + r.qty;
  for (const l of clean) after[l.sku] = (after[l.sku] || 0) + l.qty;

  // novi artikli: preveri, da obstajajo
  const fresh = {};
  for (const l of clean) {
    if (l.id && oldById[l.id]) continue;
    if (!fresh[l.sku]) {
      const a = await articleForOrder(l.sku);
      if (!a) return { ok: false, message: `Artikel ${l.sku} ne obstaja v zalogi.` };
      fresh[l.sku] = a;
    }
  }

  // ---- zapiši postavke ----
  const keep = new Set(clean.filter((l) => l.id && oldById[l.id]).map((l) => l.id));
  const removed = old.filter((r) => !keep.has(Number(r.id)));
  for (const r of removed) await sql`DELETE FROM order_items WHERE id = ${r.id}`;
  const added = [];
  const changed = [];
  for (const l of clean) {
    const r = l.id && oldById[l.id];
    if (r) {
      if (r.qty !== l.qty || r.price_cents !== l.price_cents) {
        await sql`UPDATE order_items SET qty = ${l.qty}, price_cents = ${l.price_cents} WHERE id = ${r.id}`;
        changed.push({ sku: r.sku, name: r.name, from: { qty: r.qty, price: r.price_cents }, to: { qty: l.qty, price: l.price_cents } });
      }
    } else {
      const a = fresh[l.sku];
      await sql`INSERT INTO order_items (order_id, sku, name, size, qty, price_cents, bundle_key, cost_cents)
        VALUES (${orderId}, ${a.sku}, ${a.name}, ${a.size}, ${l.qty}, ${l.price_cents}, NULL, ${a.cost_cents})`;
      added.push({ sku: a.sku, name: a.name, qty: l.qty, price: l.price_cents });
    }
  }

  // ---- zaloga ----
  const note = `Popravek – naročilo #${o.number}`;
  const stockNow = [];
  for (const sku of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const delta = (before[sku] || 0) - (after[sku] || 0); // + = vrnjeno na zalogo
    if (!delta) continue;
    const [v] = await sql`UPDATE variants SET stock = stock + ${delta} WHERE sku = ${sku} RETURNING stock`;
    await sql`INSERT INTO stock_moves (sku, delta, reason, note) VALUES (${sku}, ${delta}, 'narocilo', ${note})`;
    if (v) stockNow.push({ sku, delta, stock: v.stock });
  }

  // ---- zneski ----
  const ship = shippingCents === undefined || shippingCents === null || shippingCents === ""
    ? o.shipping_cents : Math.max(0, Math.round(Number(shippingCents) || 0));
  const [{ sub }] = await sql`SELECT COALESCE(SUM(price_cents * qty), 0)::int AS sub FROM order_items WHERE order_id = ${orderId}`;
  const total = sub + ship + (o.cod_fee_cents || 0);
  const entry = {
    at: new Date().toISOString(),
    removed: removed.map((r) => ({ sku: r.sku, name: r.name, qty: r.qty, price: r.price_cents })),
    added, changed,
    ship: ship !== o.shipping_cents ? { from: o.shipping_cents, to: ship } : null,
    total: { from: o.total_cents, to: total },
  };
  await sql`UPDATE orders SET subtotal_cents = ${sub}, shipping_cents = ${ship}, total_cents = ${total},
      edit_log = COALESCE(edit_log, '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb WHERE id = ${orderId}`;

  const msgs = [`✅ Naročilo #${o.number} popravljeno. Nov znesek: ${eur(total)}${total !== o.total_cents ? ` (prej ${eur(o.total_cents)})` : ""}.`];
  for (const s of stockNow) msgs.push(`Zaloga ${s.sku}: ${s.delta > 0 ? "+" : ""}${s.delta} → zdaj ${s.stock}.`);

  try {
    const { refreshOrderDocs } = await import("./invoices");
    const docs = await refreshOrderDocs(orderId);
    if (docs.length) msgs.push(`Popravljeno: ${docs.map((d) => d.number).join(", ")}.`);
  } catch (e) { console.error("[urejanje dokumenti]", e); msgs.push("⚠️ Dobavnice/predračuna ni bilo mogoče osvežiti."); }

  if (total !== o.total_cents) {
    if (o.payment === "card") msgs.push(`⚠️ Naročilo je plačano s kartico (${eur(o.total_cents)}) — razliko uredi s kupcem (vračilo v Stripu ali doplačilo).`);
    else if (o.paid_at) msgs.push(`⚠️ Naročilo je že plačano (${eur(o.total_cents)}) — razliko ${eur(total - o.total_cents)} uredi s kupcem.`);
  }
  if (o.posta_sent_at && o.payment === "cod" && total !== o.total_cents) {
    try {
      const { postaSend } = await import("./posta");
      const [fr] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
      const r = await postaSend(fr);
      msgs.push(r.ok ? "📮 Nov znesek poslan v portal Pošte." : `⚠️ Portal Pošte: ${r.message}.`);
    } catch {}
    msgs.push(`⚠️ Če je pošiljka v portalu že ODDANA, je na nalepki stara odkupnina ${eur(o.total_cents)} — v portalu jo popravi ali storniraj in oddaj znova.`);
  }
  return { ok: true, total, stock: stockNow, message: msgs.join(" ") };
}
