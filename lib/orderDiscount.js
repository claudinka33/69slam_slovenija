import { db } from "./db";

/**
 * Ročni popust na spletno naročilo (npr. prijateljem).
 * Popust se računa od POLNE (redne) cene artikla — nadomesti kodo za popust, paket in odprodajo (ne sešteva se).
 * pct = 0–90 (0 = odstrani popust, vrne prvotne cene naročila), freeShip = brezplačna poštnina.
 * Velja samo, dokler račun ni izdan in naročilo ni plačano s kartico.
 */
export async function applyManualDiscount(orderId, pct, freeShip) {
  const sql = db();
  pct = Math.round(Number(pct) || 0);
  if (pct < 0 || pct > 90) return { ok: false, message: "Popust mora biti med 0 in 90 %." };
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) return { ok: false, message: "Naročilo ne obstaja." };
  if (o.source === "shopify") return { ok: false, message: "Uvoženim Shopify naročilom se popusta ne spreminja." };
  if (o.status === "preklicano") return { ok: false, message: "Naročilo je preklicano." };
  if (o.payment === "card") return { ok: false, message: "Naročilo je plačano s kartico — znesek je že bremenjen. Razliko vrni kupcu v Stripu." };
  const [inv] = await sql`SELECT number FROM invoices WHERE order_id = ${orderId} AND kind = 'racun' AND status <> 'storniran' LIMIT 1`;
  if (inv) return { ok: false, message: `Račun ${inv.number} je že izdan (potrjen pri FURS), zato cene ni več mogoče spremeniti. Uporabi dobropis.` };

  // prvotne cene naročila (enkrat) — za odstranitev popusta
  await sql`UPDATE order_items SET orig_price_cents = COALESCE(orig_price_cents, price_cents) WHERE order_id = ${orderId}`;
  if (o.orig_discount_cents == null) await sql`UPDATE orders SET orig_discount_cents = ${o.discount_cents || 0} WHERE id = ${orderId}`;
  const origDisc = o.orig_discount_cents ?? o.discount_cents ?? 0;
  const noChange = pct === 0 && !freeShip;

  const items = await sql`SELECT i.id, i.sku, i.price_cents, i.orig_price_cents, i.list_price_cents, v.code
    FROM order_items i LEFT JOIN variants v ON v.sku = i.sku WHERE i.order_id = ${orderId}`;
  if (pct > 0) {
    // polna cena iz kataloga (brez kode, paketa, odprodaje)
    let cat = null;
    try { const c = await import("./catalog"); await c.primeCatalog(); cat = c; } catch {}
    for (const it of items) {
      const code = it.code || String(it.sku || "").replace(/-[^-]+$/, "");
      let full = null;
      try { const p = cat?.getAnyProduct(code); if (p?.price) full = Math.round(Number(p.price) * 100); } catch {}
      if (!full) full = it.list_price_cents || it.orig_price_cents || it.price_cents;
      const np = Math.round(full * (100 - pct) / 100);
      await sql`UPDATE order_items SET list_price_cents = ${full}, price_cents = ${np} WHERE id = ${it.id}`;
    }
  } else {
    await sql`UPDATE order_items SET price_cents = orig_price_cents, list_price_cents = NULL WHERE order_id = ${orderId}`;
  }

  const origShip = o.orig_shipping_cents ?? o.shipping_cents;
  const ship = freeShip ? 0 : origShip;
  const [{ sub }] = await sql`SELECT COALESCE(SUM(price_cents * qty), 0)::int AS sub FROM order_items WHERE order_id = ${orderId}`;
  const total = sub + ship + (o.cod_fee_cents || 0);
  await sql`UPDATE orders SET subtotal_cents = ${sub}, shipping_cents = ${ship}, total_cents = ${total},
      discount_cents = ${pct > 0 ? 0 : origDisc},
      manual_pct = ${pct || null}, orig_shipping_cents = ${noChange ? null : origShip} WHERE id = ${orderId}`;
  if (noChange) {
    await sql`UPDATE order_items SET orig_price_cents = NULL WHERE order_id = ${orderId}`;
    await sql`UPDATE orders SET orig_discount_cents = NULL WHERE id = ${orderId}`;
  }

  const eur = (c) => (c / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2 }) + " €";
  const msgs = [noChange ? "Popust odstranjen — prvotne cene naročila." : `Popust ${pct ? pct + " % od polne cene" : ""}${pct && freeShip ? " + " : ""}${freeShip ? "brezplačna poštnina" : ""} uporabljen${pct && o.coupon_code ? ` (namesto kode ${o.coupon_code})` : ""}.`,
    `Nov znesek: ${eur(total)}.`];

  try {
    const { refreshOrderDocs } = await import("./invoices");
    const docs = await refreshOrderDocs(orderId);
    if (docs.length) msgs.push(`Popravljeno: ${docs.map((d) => d.number).join(", ")}.`);
  } catch (e) { console.error("[popust dokumenti]", e); msgs.push("⚠️ Dobavnice ni bilo mogoče osvežiti."); }

  if (o.posta_sent_at && o.payment === "cod" && total !== o.total_cents) {
    try {
      const { postaSend } = await import("./posta");
      const [fresh] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
      const r = await postaSend(fresh);
      msgs.push(r.ok ? "📮 Nov znesek poslan v portal Pošte." : `⚠️ Portal Pošte: ${r.message}.`);
    } catch {}
    msgs.push(`⚠️ Če je pošiljka v portalu že ODDANA, je na nalepki stara odkupnina ${eur(o.total_cents)} — v portalu jo popravi (Uredi) ali storniraj in oddaj znova, da bo odkupnina ${eur(total)}.`);
  }
  return { ok: true, total, message: msgs.join(" ") };
}
