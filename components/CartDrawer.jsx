"use client";
import Link from "next/link";
import { useCart } from "./CartContext";
import { fmt } from "../lib/i18n";

export default function CartDrawer({ lang, t }) {
  const {
    cart, byId, chQty, subtotal, shipping, bundlePrice, singles,
    drawerOpen, setDrawerOpen, openBundle, BUNDLE_N,
  } = useCart();

  return (
    <>
      <div className={`overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`drawer ${drawerOpen ? "open" : ""}`}>
        <div className="dhead">
          <h3>{t.cart_title}</h3>
          <button className="x" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>
        <div className="dbody">
          {cart.length === 0 ? (
            <div className="empty">{t.cart_empty}</div>
          ) : (
            cart.map((c, i) => {
              if (c.bundle) {
                const names = c.items.map((x) => `${byId(x.id)?.name} (${x.size})`).join(", ");
                return (
                  <div className="citem" key={i}>
                    <div className="cthumb" style={{ backgroundImage: `url('${byId(c.items[0].id)?.img}')` }} />
                    <div className="cmeta">
                      <b>{t.bundle_title} <span style={{ color: "var(--red)" }}>−15%</span></b>
                      {names} · {fmt(bundlePrice(c.items))}
                    </div>
                    <div className="qty"><button onClick={() => chQty(i, -1)}>✕</button></div>
                  </div>
                );
              }
              const p = byId(c.id);
              if (!p) return null;
              return (
                <div className="citem" key={i}>
                  <div className="cthumb" style={{ backgroundImage: `url('${p.img}')` }} />
                  <div className="cmeta">
                    <b>{p.name}</b>
                    {c.size} · {fmt(p.effPrice)}
                    {p.sale ? <span style={{ color: "var(--red)", fontWeight: 700 }}> −50%</span> : null}
                  </div>
                  <div className="qty">
                    <button onClick={() => chQty(i, -1)}>−</button>
                    <span>{c.qty}</span>
                    <button onClick={() => chQty(i, 1)}>+</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {cart.length > 0 && (
          <div className="dfoot">
            {singles >= 1 && singles < BUNDLE_N && (
              <div className="upsell">
                <span>💡 {t.upsell}</span>
                <button onClick={openBundle}>{t.bundle_cta}</button>
              </div>
            )}
            <div className="trow"><span>{t.subtotal}</span><b>{fmt(subtotal)}</b></div>
            <div className="trow"><span>{t.shipping}</span><b>{shipping === 0 ? t.ship_free : fmt(shipping)}</b></div>
            <div className="trow total"><span>{t.total}</span><span>{fmt(subtotal + shipping)}</span></div>
            <Link href={`/${lang}/blagajna`} className="checkout-btn" onClick={() => setDrawerOpen(false)}>
              {t.checkout}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
