import { db, dbConfigured, ensureSchema } from "../../../lib/db";
import { primeCatalog, getAnyProduct } from "../../../lib/catalog";
import { sign } from "../../../lib/marketing";
import ReviewForm from "../../../components/ReviewForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Oceni nakup | 69SLAM.si", robots: { index: false } };

export default async function OcenaPage({ params, searchParams }) {
  const { lang } = await params;
  const { o, t } = await searchParams;
  const en = lang === "en";
  let order = null, items = [];
  if (dbConfigured() && o && t && sign("review", Number(o)) === t) {
    await ensureSchema();
    await primeCatalog();
    const sql = db();
    [order] = await sql`SELECT id, number, name FROM orders WHERE id = ${Number(o)}`;
    if (order) {
      const rows = await sql`SELECT DISTINCT v.code FROM order_items i JOIN variants v ON v.sku = i.sku WHERE i.order_id = ${order.id}`;
      const done = new Set((await sql`SELECT code FROM reviews WHERE order_id = ${order.id}`).map((r) => r.code));
      items = rows.filter((r) => !done.has(r.code)).map((r) => {
        const p = getAnyProduct(r.code);
        return { code: r.code, name: p?.name || r.code, type: p?.type || "", img: p?.img || "" };
      });
    }
  }
  const first = order?.name ? order.name.trim().split(/\s+/) : [];
  const shown = first.length ? `${first[0]}${first[1] ? " " + first[1][0] + "." : ""}` : "";
  return (
    <main className="wrap ckpage" style={{ maxWidth: 720, padding: "40px 16px 60px" }}>
      <div className="over">69SLAM.si</div>
      <h2>{en ? "Rate your order" : "Oceni svoj nakup"} ⭐</h2>
      {!order ? <p>{en ? "This link is not valid." : "Povezava ni veljavna."}</p>
        : !items.length ? <p>{en ? "You have already reviewed all items from this order — thank you! 💚" : "Vse artikle iz tega naročila si že ocenil/-a — hvala! 💚"}</p>
        : <>
          <p style={{ color: "var(--gray)", marginBottom: 18 }}>{en ? `Order #${order.number}. Rate one or more items — as a thank-you you get a discount code for your next order.` : `Naročilo #${order.number}. Oceni enega ali več artiklov — za zahvalo dobiš kodo za popust za naslednji nakup.`}</p>
          <ReviewForm lang={lang} o={order.id} t={t} name={shown} items={items} />
        </>}
    </main>
  );
}
