import { NextResponse } from "next/server";
import { stripe, markPaid, cancelUnpaid } from "../../../../lib/payments";
import { dbConfigured, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe obvestila: plačano / seja potekla. */
export async function POST(req) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret || !dbConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const raw = await req.text();
  let ev;
  try {
    ev = s.webhooks.constructEvent(raw, req.headers.get("stripe-signature") || "", secret);
  } catch {
    return NextResponse.json({ ok: false, message: "bad signature" }, { status: 400 });
  }
  await ensureSchema();
  const obj = ev.data.object;
  const orderId = Number(obj?.metadata?.order_id || obj?.client_reference_id || 0);
  if (orderId) {
    if ((ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && obj.payment_status === "paid")
      await markPaid(orderId, obj.payment_intent || obj.id);
    if (ev.type === "checkout.session.expired" || ev.type === "checkout.session.async_payment_failed")
      await cancelUnpaid(orderId, "Plačilo s kartico ni bilo zaključeno");
  }
  return NextResponse.json({ received: true });
}
