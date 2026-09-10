"use client";
import { useState } from "react";
import { useCart } from "./CartContext";
import { fmt } from "../lib/i18n";

const COD_FEE = 1.5;

export default function CheckoutForm({ lang, t }) {
  const { cart, byId, subtotal, shipping, bundlePrice } = useCart();
  const [pay, setPay] = useState("card");
  const [msg, setMsg] = useState("");
  const codFee = pay === "cod" ? COD_FEE : 0;
  const total = subtotal + shipping + codFee;

  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer: data, payment: pay, cart, lang }),
    });
    const out = await res.json();
    setMsg(out.message || t.ck_stub);
  }

  if (cart.length === 0) return <div className="empty">{t.cart_empty}</div>;

  return (
    <div className="ckgrid">
      <form className="ckcard ckform" onSubmit={submit}>
        <h3>{t.ck_contact}</h3>
        <label>{t.ck_name}</label>
        <input name="name" required />
        <label>{t.ck_email}</label>
        <input name="email" type="email" required />
        <label>{t.ck_phone}</label>
        <input name="phone" />
        <label>{t.ck_addr}</label>
        <input name="address" required />
        <div className="ck2">
          <div>
            <label>{t.ck_zip}</label>
            <input name="zip" required />
          </div>
          <div>
            <label>{t.ck_city}</label>
            <input name="city" required />
          </div>
        </div>

        <h3 style={{ marginTop: 22 }}>{t.ck_pay}</h3>
        {[
          ["card", "💳", t.pay_card, t.pay_card_d],
          ["proforma", "🧾", t.pay_pro, t.pay_pro_d],
          ["cod", "📦", t.pay_cod, t.pay_cod_d],
        ].map(([val, ico, title, d]) => (
          <label className="pay" key={val}>
            <input type="radio" name="pay" checked={pay === val} onChange={() => setPay(val)} />
            <span><b>{ico} {title}</b>{d}</span>
          </label>
        ))}

        <button className="checkout-btn" style={{ marginTop: 14 }}>{t.ck_submit}</button>
        {msg && <div className="stubnote">{msg}</div>}
      </form>

      <div className="ckcard">
        <h3>{t.cart_title}</h3>
        {cart.map((c, i) => {
          if (c.bundle) {
            return (
              <div className="trow" key={i}>
                <span>{t.bundle_title} −15% ({c.items.map((x) => `${byId(x.id)?.name} ${x.size}`).join(", ")})</span>
                <b>{fmt(bundlePrice(c.items))}</b>
              </div>
            );
          }
          const p = byId(c.id);
          return (
            <div className="trow" key={i}>
              <span>{c.qty}× {p?.name} ({c.size})</span>
              <b>{fmt((p?.effPrice || 0) * c.qty)}</b>
            </div>
          );
        })}
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "12px 0" }} />
        <div className="trow"><span>{t.subtotal}</span><b>{fmt(subtotal)}</b></div>
        <div className="trow"><span>{t.shipping}</span><b>{shipping === 0 ? t.ship_free : fmt(shipping)}</b></div>
        {codFee > 0 && <div className="trow"><span>{t.cod_fee}</span><b>{fmt(codFee)}</b></div>}
        <div className="trow total"><span>{t.total}</span><span>{fmt(total)}</span></div>
      </div>
    </div>
  );
}
