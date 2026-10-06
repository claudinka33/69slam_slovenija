"use client";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartContext";
import { fmt, tx } from "../lib/i18n";
import { track, adCookies } from "../lib/track";
import { TrackPurchase } from "./Track";
import PromoHint from "./PromoHint";
import { COD_FEE, country as countryOf, countryOptions, shipFor } from "../lib/shipping";
import { storedPromo } from "./usePromo";


export default function CheckoutForm({ lang, t }) {
  const { cart, byId, subtotal, shipping, shipCountry, setShipCountry, bundlePrice, clearCart } = useCart();
  const cInfo = countryOf(shipCountry);
  const codOk = !!cInfo?.cod;
  const [pay, setPay] = useState("card");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null); // številka naročila
  const [upn, setUpn] = useState(null); // podatki za plačilo po predračunu
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, percent }
  const [cmsg, setCmsg] = useState("");
  const [bought, setBought] = useState(null); // podatki za dogodek nakupa
  const startSent = useRef(false);
  // začetek nakupa (enkrat, ko je košarica naložena)
  useEffect(() => {
    if (startSent.current || !cart.length) return;
    startSent.current = true;
    const items = cart.flatMap((c) => c.bundle
      ? c.items.map((x) => { const p = byId(x.id); return { id: x.id, name: p?.name, price: +((p?.price || 0) * 0.85).toFixed(2), qty: 1, size: x.size }; })
      : [{ id: c.id, name: byId(c.id)?.name, price: byId(c.id)?.effPrice || 0, qty: c.qty, size: c.size }]);
    track("InitiateCheckout", { value: subtotal, items });
  }, [cart.length]);
  // velja boljši popust: koda ALI paket/odprodaja (nikoli oba)
  const best = (cur, base) => (coupon ? Math.min(cur, Math.round(base * (1 - coupon.percent / 100) * 100) / 100) : cur);
  const lineTotal = (c) => {
    if (c.bundle) return c.items.reduce((a, x) => { const p = byId(x.id); const base = p?.price || 0; return a + best(+(base * 0.85).toFixed(2), base); }, 0);
    const p = byId(c.id); return best(p?.effPrice || 0, p?.price || 0) * c.qty;
  };
  const sub2 = coupon ? +cart.reduce((a, c) => a + lineTotal(c), 0).toFixed(2) : subtotal;
  const discount = +(subtotal - sub2).toFixed(2);
  const ship2 = (coupon ? shipFor(shipCountry, sub2) : shipping) || 0;
  useEffect(() => { if (!codOk && pay === "cod") setPay("card"); }, [codOk]);
  const codFee = pay === "cod" ? COD_FEE : 0;
  const total = sub2 + ship2 + codFee;
  async function applyCode(c0, quiet) {
    const c = typeof c0 === "string" ? c0 : code;
    setCmsg("");
    if (!c.trim()) return;
    const email = document.querySelector('input[name="email"]')?.value || "";
    const r = await fetch("/api/coupon", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c, email, subtotal, lang }) }).then((x) => x.json()).catch(() => null);
    if (r?.ok) { setCoupon({ code: r.code, percent: r.percent }); setCode(r.code); }
    else { setCoupon(null); if (!quiet) setCmsg(r?.message || tx(lang, "Koda ni veljavna.", "Code is not valid.", "Kod nije valjan.")); }
  }
  // koda iz drsnika/košarice se uveljavi sama
  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current || !cart.length || coupon) return;
    const c = storedPromo();
    if (!c) return;
    autoTried.current = true;
    setCode(c);
    applyCode(c, true);
  }, [cart.length]);

  // shrani košarico z e-mailom (opomnik, če nakup ne bo zaključen)
  async function saveCart(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || "") || !cart.length) return;
    let token = "";
    try { token = localStorage.getItem("cart69t") || ""; } catch {}
    const r = await fetch("/api/cart-save", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, cart, lang, token, total: subtotal }) }).then((x) => x.json()).catch(() => null);
    if (r?.token) try { localStorage.setItem("cart69t", r.token); } catch {}
  }

  async function submit(e) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setMsg("");
    const data = Object.fromEntries(new FormData(e.target));
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: data, payment: pay, cart, lang, coupon: coupon?.code || null, ad: adCookies() }),
      });
      const out = await res.json();
      if (out.ok && out.redirect) {
        try { localStorage.removeItem("cart69t"); } catch {}
        window.location.href = out.redirect; // Stripe plačilna stran
        return;
      }
      if (out.ok && out.number) {
        if (out.track) setBought({ number: out.number, ...out.track });
        setSuccess(out.number);
        try { localStorage.removeItem("cart69t"); } catch {}
        if (out.upn) setUpn(out.upn);
        clearCart();
      } else {
        setMsg(out.message || t.ck_stub);
      }
    } catch {
      setMsg(t.ck_stub);
    }
    setSending(false);
  }

  if (success) {
    return (
      <div className="ckcard" style={{ maxWidth: 560, margin: "24px auto", textAlign: "center", padding: 40 }}>
        {bought && <TrackPurchase number={bought.number} value={bought.value} items={bought.items} />}
        <div style={{ fontSize: "3rem" }}>✅</div>
        <h3 style={{ margin: "10px 0 6px", fontSize: "1.4rem" }}>
          {lang === "hr" ? "Narudžba" : lang === "en" ? "Order" : "Naročilo"} #{success}
        </h3>
        <p style={{ color: "var(--gray)" }}>
          {lang === "hr"
            ? "Hvala na kupnji! Detalje smo zabilježili — potvrda slijedi na e-mail."
            : lang === "en"
            ? "Thank you! Your order is recorded — a confirmation will follow by e-mail."
            : "Hvala za nakup! Naročilo je zabeleženo — potrditev sledi na e-mail."}
        </p>
        {upn && (
          <div className="upnbox">
            <h4>{tx(lang, "Plačilo po predračunu", "Pay by bank transfer", "Plaćanje po predračunu")}</h4>
            <p>{tx(lang, "Skeniraj QR kodo z mobilno banko — vsi podatki se izpolnijo sami.", "Scan the QR code with your mobile banking app — all details are filled in.", "Skeniraj QR kod mobilnim bankarstvom — svi se podaci ispune sami.")}</p>
            <div className="upnqr" dangerouslySetInnerHTML={{ __html: upn.svg }} />
            <dl>
              <dt>{tx(lang, "Znesek", "Amount", "Iznos")}</dt><dd><b>{fmt(upn.amount / 100)}</b></dd>
              <dt>{tx(lang, "Prejemnik", "Payee", "Primatelj")}</dt><dd>{upn.payee}, {upn.address}</dd>
              <dt>IBAN</dt><dd><b>{upn.iban}</b> ({upn.bank}, BIC {upn.bic})</dd>
              <dt>{tx(lang, "Sklic", "Reference", "Poziv na broj")}</dt><dd><b>{upn.ref}</b></dd>
              <dt>{tx(lang, "Rok plačila", "Due", "Rok plaćanja")}</dt><dd>{upn.due}</dd>
            </dl>
            <p className="upnnote">{tx(lang, "Paket pošljemo takoj, ko prejmemo plačilo.", "We ship your order as soon as the payment arrives.", "Paket šaljemo čim primimo uplatu.")}</p>
          </div>
        )}
        <a className="checkout-btn" style={{ display: "inline-block", marginTop: 18, padding: "12px 22px", width: "auto" }} href={`/${lang}`}>
          {lang === "en" ? "Continue shopping" : lang === "hr" ? "Nastavi kupovinu" : "Nadaljuj z nakupovanjem"}
        </a>
      </div>
    );
  }

  if (cart.length === 0) return <div className="empty">{t.cart_empty}</div>;

  return (
    <div className="ckgrid">
      <form className="ckcard ckform" onSubmit={submit}>
        <h3>{t.ck_contact}</h3>
        <label>{t.ck_name}</label>
        <input name="name" required />
        <label>{t.ck_email}</label>
        <input name="email" type="email" required onBlur={(e) => saveCart(e.target.value.trim())} />
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
        <label>{tx(lang, "Država", "Country", "Država")}</label>
        <select name="country" required value={shipCountry || ""} onChange={(e) => setShipCountry(e.target.value)}>
          {!shipCountry && <option value="">{tx(lang, "Izberi državo …", "Choose country …", "Odaberi državu …")}</option>}
          {countryOptions(lang).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        {cInfo && <div style={{ fontSize: ".78rem", color: "var(--gray)", marginTop: 6 }}>
          🚚 {tx(lang, `Poštnina ${fmt(cInfo.ship)} · brezplačno nad ${cInfo.free} € · dostava ${cInfo.days} delovnih dni`, `Shipping ${fmt(cInfo.ship)} · free over €${cInfo.free} · delivery ${cInfo.days} working days`, `Poštarina ${fmt(cInfo.ship)} · besplatno iznad ${cInfo.free} € · dostava ${cInfo.days} radna dana`)}
        </div>}

        <h3 style={{ marginTop: 22 }}>{t.ck_pay}</h3>
        {[
          ["card", "💳", t.pay_card, t.pay_card_d],
          ["proforma", "🧾", t.pay_pro, t.pay_pro_d],
          ...(codOk ? [["cod", "📦", t.pay_cod, t.pay_cod_d]] : []),
        ].map(([val, ico, title, d]) => (
          <label className="pay" key={val}>
            <input type="radio" name="pay" checked={pay === val} onChange={() => setPay(val)} />
            <span><b>{ico} {title}</b>{d}</span>
          </label>
        ))}

        <p style={{ margin: "16px 0 0", fontSize: ".78rem", color: "var(--gray)", lineHeight: 1.5 }}>
          {tx(lang, "Občasno ti bomo poslali novice in ponudbe za podobne izdelke. Odjaviš se lahko v vsakem e-mailu.", "We'll occasionally send you news and offers for similar products. You can unsubscribe in every e-mail.", "Povremeno ćemo ti slati novosti i ponude za slične proizvode. Odjaviti se možeš u svakom e-mailu.")}
        </p>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "10px 0 0", fontSize: ".84rem", textTransform: "none", letterSpacing: 0, fontWeight: 500, color: "#333", lineHeight: 1.5 }}>
          <input type="checkbox" name="agree" required style={{ width: "auto", marginTop: 3, accentColor: "var(--accent)" }} />
          <span>
            {t.ck_agree1} <a href={`/${lang}/info/splosni-pogoji`} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>{t.ck_agree2}</a> {t.ck_agree3}{" "}
            <a href={`/${lang}/info/zasebnost`} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>{t.ck_agree4}</a> {t.ck_agree5}{" "}
            (<a href={`/${lang}/info/vracila-in-odstop`} target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>info</a>).
          </span>
        </label>
        <button className="checkout-btn" style={{ marginTop: 14 }} disabled={sending}>
          {sending ? "…" : t.ck_submit}
        </button>
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
        <div className="ckcode">
          <input placeholder={tx(lang, "Koda za popust", "Discount code", "Kod za popust")} value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); if (coupon) setCoupon(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }} />
          <button type="button" onClick={applyCode}>{tx(lang, "Uporabi", "Apply", "Primijeni")}</button>
        </div>
        {cmsg && <div className="ckcode-msg err">{cmsg}</div>}
        <PromoHint lang={lang} active={!!coupon} onApply={(c) => { setCode(c); applyCode(c); }} />
        {coupon && <div className="ckcode-msg ok">✓ {tx(lang, `Koda ${coupon.code}: −${coupon.percent} %`, `Code ${coupon.code}: −${coupon.percent} %`, `Kod ${coupon.code}: −${coupon.percent} %`)}
          {discount <= 0 && <span> — {tx(lang, "trenutni popust (paket/akcija) je že boljši.", "your current discount is already better.", "trenutni popust (paket/akcija) već je bolji.")}</span>}</div>}
        <div className="trow"><span>{t.subtotal}</span><b>{fmt(subtotal)}</b></div>
        {coupon && discount > 0 && <div className="trow" style={{ color: "var(--red)" }}><span>{tx(lang, "Popust", "Discount", "Popust")} ({coupon.code})</span><b>−{fmt(discount)}</b></div>}
        <div className="trow"><span>{t.shipping}</span><b>{!cInfo ? "—" : ship2 === 0 ? t.ship_free : fmt(ship2)}</b></div>
        {codFee > 0 && <div className="trow"><span>{t.cod_fee}</span><b>{fmt(codFee)}</b></div>}
        <div className="trow total"><span>{t.total}</span><span>{fmt(total)}</span></div>
      </div>
    </div>
  );
}
