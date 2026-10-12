import { db } from "./db";

/**
 * Ročni popust na spletno naročilo (npr. prijateljem).
 * pct = 0–90 (0 = odstrani popust), freeShip = brezplačna poštnina.
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

  // cene artiklov: vedno od prvotne cene (popust se ne sešteva)
  await sql`UPDATE order_items SET orig_price_cents = COALESCE(orig_price_cents, price_cents) WHERE order_id = ${orderId}`;
  await sql`UPDATE order_items SET price_cents = ROUND(orig_price_cents * ${100 - pct} / 100.0)::int WHERE order_id = ${orderId}`;
  const origShip = o.orig_shipping_cents ?? o.shipping_cents;
  const ship = freeShip ? 0 : origShip;
  const [{ sub }] = await sql`SELECT COALESCE(SUM(price_cents * qty), 0)::int AS sub FROM order_items WHERE order_id = ${orderId}`;
  const total = sub + ship + (o.cod_fee_cents || 0);
  const noChange = pct === 0 && !freeShip;
  await sql`UPDATE orders SET subtotal_cents = ${sub}, shipping_cents = ${ship}, total_cents = ${total},
      manual_pct = ${pct || null}, orig_shipping_cents = ${noChange ? null : origShip} WHERE id = ${orderId}`;
  if (noChange) await sql`UPDATE order_items SET orig_price_cents = NULL WHERE order_id = ${orderId}`;

  const msgs = [noChange ? "Popust odstranjen." : `Popust ${pct ? pct + " %" : ""}${pct && freeShip ? " + " : ""}${freeShip ? "brezplačna poštnina" : ""} uporabljen.`,
    `Nov znesek: ${(total / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2 })} €.`];

  // dobavnica / predračun z novimi cenami
  try {
    const { refreshOrderDocs } = await import("./invoices");
    const docs = await refreshOrderDocs(orderId);
    if (docs.length) msgs.push(`Popravljeno: ${docs.map((d) => d.number).join(", ")}.`);
  } catch (e) { console.error("[popust dokumenti]", e); msgs.push("⚠️ Dobavnice ni bilo mogoče osvežiti."); }

  // portal Pošte: nov znesek odkupnine
  if (o.posta_sent_at) {
    try {
      const { postaSend } = await import("./posta");
      const [fresh] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
      const r = await postaSend(fresh);
      msgs.push(r.ok ? "📮 Nov znesek poslan v portal Pošte." : `⚠️ Portal Pošte: ${r.message} — znesek odkupnine v portalu popravi ročno.`);
    } catch (e) { msgs.push("⚠️ Portala Pošte ni bilo mogoče posodobiti — znesek odkupnine popravi ročno."); }
  }
  return { ok: true, total, message: msgs.join(" ") };
}
