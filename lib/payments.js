import Stripe from "stripe";
import { db } from "./db";

let _s = null;
/** Stripe odjemalec (null, če ključ ni nastavljen). */
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_s) _s = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _s;
}

/** Naročilo označi kot plačano (enkrat). */
export async function markPaid(orderId, ref) {
  const sql = db();
  const r = await sql`UPDATE orders SET status = CASE WHEN status = 'novo' THEN 'placano' ELSE status END,
      paid_at = COALESCE(paid_at, now()), payment_ref = COALESCE(payment_ref, ${ref || null})
    WHERE id = ${orderId} AND paid_at IS NULL RETURNING id, number`;
  if (r[0]) {
    await mailNewOrder(orderId);
    const { sendPurchase } = await import("./capi");
    await sendPurchase(orderId);
  }
  return r[0] || null;
}

/** Potrditev kupcu + obvestilo trgovini (samo enkrat na naročilo). */
export async function mailNewOrder(orderId) {
  try {
    const sql = db();
    const [o] = await sql`UPDATE orders SET mailed_at = now() WHERE id = ${orderId} AND mailed_at IS NULL RETURNING id`;
    if (!o) return;
    const { sendOrderConfirmation, sendAdminNotice } = await import("./mail");
    await Promise.allSettled([sendOrderConfirmation(orderId), sendAdminNotice(orderId)]);
    const { afterOrder } = await import("./marketing");
    await afterOrder(orderId).catch((e) => console.error("[afterOrder]", e));
  } catch (e) { console.error("[mail]", e); }
}

/** Neplačano kartično naročilo prekliče in vrne zalogo (npr. ko Stripe seja poteče). */
export async function cancelUnpaid(orderId, note) {
  const sql = db();
  const r = await sql`UPDATE orders SET status = 'preklicano'
    WHERE id = ${orderId} AND paid_at IS NULL AND status = 'novo' RETURNING id, number`;
  if (!r.length) return false;
  const items = await sql`SELECT sku, qty FROM order_items WHERE order_id = ${orderId}`;
  for (const it of items) {
    await sql`UPDATE variants SET stock = stock + ${it.qty} WHERE sku = ${it.sku}`;
    await sql`INSERT INTO stock_moves (sku, delta, reason, note) VALUES (${it.sku}, ${it.qty}, 'preklic', ${note || "Neplačano naročilo #" + r[0].number})`;
  }
  return true;
}
