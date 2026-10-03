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
  return r[0] || null;
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
