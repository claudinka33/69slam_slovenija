import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { stripe, markPaid } from "../../../../lib/payments";
import ClearCart from "../../../../components/ClearCart";
import { TrackPurchase } from "../../../../components/Track";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { robots: { index: false } };

export default async function ThanksPage({ params, searchParams }) {
  const { lang } = await params;
  const sp = await searchParams;
  const en = lang === "en";
  const number = String(sp?.o || "").replace(/\D/g, "");
  let paid = false;
  let bought = null; // podatki za dogodek nakupa v brskalniku
  if (sp?.s && stripe() && dbConfigured()) {
    try {
      await ensureSchema();
      const sess = await stripe().checkout.sessions.retrieve(String(sp.s));
      if (sess.payment_status === "paid" && sess.metadata?.order_id) {
        await markPaid(Number(sess.metadata.order_id), sess.payment_intent || sess.id);
        paid = true;
        const sql = db();
        const [o] = await sql`SELECT number, total_cents FROM orders WHERE id = ${Number(sess.metadata.order_id)}`;
        const its = await sql`SELECT sku, name, size, qty, price_cents FROM order_items WHERE order_id = ${Number(sess.metadata.order_id)}`;
        if (o) bought = {
          number: Number(o.number),
          value: o.total_cents / 100,
          items: its.map((i) => ({ id: String(i.sku).replace(/-[^-]+$/, ""), name: i.name, size: i.size, qty: i.qty, price: i.price_cents / 100 })),
        };
      }
    } catch { /* prikaži nevtralno sporočilo */ }
  }
  const cancelled = sp?.preklic === "1";
  return (
    <main className="ckpage wrap">
      {paid && <ClearCart />}
      {bought && <TrackPurchase number={bought.number} value={bought.value} items={bought.items} />}
      <div className="ckcard" style={{ maxWidth: 560, margin: "24px auto", textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: "3rem" }}>{cancelled ? "↩️" : "✅"}</div>
        <h3 style={{ margin: "10px 0 6px", fontSize: "1.4rem" }}>
          {cancelled ? (en ? "Payment cancelled" : "Plačilo preklicano") : `${en ? "Order" : "Naročilo"} #${number}`}
        </h3>
        <p style={{ color: "var(--gray)" }}>
          {cancelled
            ? (en ? "Your card was not charged. Your cart is still saved — you can try again or choose another payment method."
                  : "Kartica ni bila bremenjena. Košarica je ostala shranjena — poskusi znova ali izberi drug način plačila.")
            : paid
            ? (en ? "Payment received — thank you! A confirmation will follow by e-mail." : "Plačilo je uspelo — hvala za nakup! Potrditev sledi na e-mail.")
            : (en ? "Thank you! We are confirming your payment — a confirmation will follow by e-mail." : "Hvala! Plačilo preverjamo — potrditev sledi na e-mail.")}
        </p>
        <a className="checkout-btn" style={{ display: "inline-block", marginTop: 18, padding: "12px 22px", width: "auto" }}
          href={cancelled ? `/${lang}/blagajna` : `/${lang}`}>{cancelled ? (en ? "Back to checkout" : "Nazaj na blagajno") : (en ? "Continue shopping" : "Nadaljuj z nakupovanjem")}</a>
      </div>
    </main>
  );
}
