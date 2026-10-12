import { db } from "./db";

/**
 * Naročilo označi kot »Poslano«: shrani sledilno številko, izda račun in kupcu pošlje mail »Paket je na poti« (z računom).
 * Uporablja ga ročni klik v adminu in samodejni prevzem sledilne številke iz portala Pošte.
 * Vrne { mailed, invoice }.
 */
export async function markShipped(id, tracking) {
  const sql = db();
  const [prev] = await sql`SELECT status, source FROM orders WHERE id = ${id}`;
  if (!prev) return { mailed: false, invoice: null };
  const trk = tracking ? String(tracking).trim().slice(0, 60) : null;
  await sql`UPDATE orders SET status = 'poslano', tracking = COALESCE(${trk}, tracking) WHERE id = ${id}`;
  if (trk) await sql`UPDATE invoices SET tracking = ${trk} WHERE order_id = ${id} AND kind = 'dobavnica'`;

  let mailed = false;
  let invoiceNo = null;
  if (prev.status !== "poslano" && prev.source !== "shopify") {
    // račun se izda ob pošiljanju in gre kupcu kot priloga maila »paket je na poti«
    let att = null;
    try {
      const { invoiceFromOrder, invoicePdf } = await import("./invoices");
      const inv = await invoiceFromOrder(id);
      if (inv) {
        att = [{ filename: `racun-${inv.number}.pdf`, content: (await invoicePdf(inv)).toString("base64") }];
        invoiceNo = inv.number;
      }
    } catch (e) { console.error("[račun]", e); }
    try {
      const { sendShipped, mailConfigured } = await import("./mail");
      if (mailConfigured()) {
        const r = await sendShipped(id, att);
        mailed = true;
        if (att && invoiceNo && !r?.error) await sql`UPDATE invoices SET sent_at = now(), sent_to = (SELECT email FROM orders WHERE id = ${id}) WHERE number = ${invoiceNo}`;
      }
    } catch (e) { console.error(e); }
  }
  return { mailed, invoice: invoiceNo };
}

/**
 * Samodejno: za naročila, poslana v portal Pošte, preveri, ali je že dodeljena sledilna številka.
 * Ko je, se naročilo samo označi kot »Poslano« (račun + mail kupcu). Kliče ga cron vsakih ~10 min.
 */
export async function postaPoll(limit = 15) {
  const { postaConfigured, postaStatus } = await import("./posta");
  if (!postaConfigured()) return { skipped: "ni žetona" };
  const sql = db();
  const rows = await sql`SELECT id, number, created_at, posta_ref FROM orders
    WHERE posta_sent_at IS NOT NULL AND status IN ('novo', 'placano')
      AND posta_sent_at > now() - interval '14 days'
      AND (posta_checked_at IS NULL OR posta_checked_at < now() - interval '9 minutes')
    ORDER BY posta_checked_at NULLS FIRST LIMIT ${limit}`;
  let shipped = 0;
  for (const o of rows) {
    const st = await postaStatus(o);
    await sql`UPDATE orders SET posta_checked_at = now(), posta_status = ${st.text || null} WHERE id = ${o.id}`;
    if (st.ok && st.tracking) {
      await markShipped(o.id, st.tracking);
      shipped++;
    }
  }
  return { checked: rows.length, shipped };
}
