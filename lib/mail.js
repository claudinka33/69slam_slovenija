import { Resend } from "resend";
import QRCode from "qrcode";
import { db } from "./db";
import { COMPANY } from "./legal";

const FROM = process.env.MAIL_FROM || "69SLAM <narocila@69slam.si>";
const REPLY = process.env.MAIL_REPLY || "69slamslovenia@gmail.com";
const ADMIN = process.env.MAIL_ADMIN || "69slamslovenia@gmail.com";
export const SITE = process.env.SITE_URL || "https://69slam-slovenija.vercel.app";

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);
export const eur = (c) => (Number(c || 0) / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const PAY = { card: "Plačilna kartica", proforma: "Predračun (UPN)", cod: "Po povzetju" };
const PAY_EN = { card: "Card", proforma: "Bank transfer (pro-forma)", cod: "Cash on delivery" };

export async function send({ to, subject, html, attachments }) {
  if (!mailConfigured()) return { skipped: true };
  const r = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await r.emails.send({ from: FROM, to, replyTo: REPLY, subject, html, attachments });
  if (error) console.error("[mail]", subject, error);
  return { data, error };
}

/** Masovno pošiljanje (do 100 na klic) z glavo za odjavo. */
export async function sendBatch(list) {
  if (!mailConfigured()) return { error: { message: "RESEND_API_KEY manjka" } };
  const r = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await r.batch.send(list.map((m) => ({ from: FROM, replyTo: REPLY, to: m.to, subject: m.subject, html: m.html,
    headers: m.unsub ? { "List-Unsubscribe": `<${m.unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined })));
  if (error) console.error("[mail batch]", error);
  return { data, error };
}

export function shell(title, body, footerExtra = "") {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0a0a0a;padding:22px 28px;color:#fff;font-weight:900;font-size:22px;letter-spacing:-.02em">69SLAM</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-.01em">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:18px 28px;background:#f5f5f7;color:#666;font-size:12px;line-height:1.6">
${esc(COMPANY.name)} · ${esc(COMPANY.address)} · ID za DDV ${esc(COMPANY.vat)}<br>
Vprašanja? Odgovori na ta e-mail ali piši na ${esc(REPLY)} · tel. ${esc(COMPANY.phone)}${footerExtra}
</td></tr></table></td></tr></table></body></html>`;
}

async function loadOrder(id) {
  const sql = db();
  const [o] = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (!o) return null;
  const items = await sql`SELECT name, size, qty, price_cents, bundle_key FROM order_items WHERE order_id = ${id} ORDER BY id`;
  return { ...o, items };
}

function itemsTable(o, en) {
  const rows = o.items.map((it) => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee">${esc(it.name)} <span style="color:#666">(${esc(it.size)})${it.bundle_key ? " · Paket 3" : ""}</span></td>
<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;color:#666">${it.qty}×</td>
<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${eur(it.price_cents * it.qty)}</td></tr>`).join("");
  const line = (a, b, bold) => `<tr><td colspan="2" style="padding:5px 0;${bold ? "font-weight:900;font-size:16px" : "color:#666"}">${a}</td><td style="padding:5px 0;text-align:right;${bold ? "font-weight:900;font-size:16px" : ""}">${b}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0 4px">${rows}
${line(en ? "Subtotal" : "Blago", eur(o.subtotal_cents))}
${o.discount_cents ? line(`${en ? "Discount code" : "Koda za popust"} ${esc(o.coupon_code || "")}`, `vključen −${eur(o.discount_cents)}`) : ""}
${line(en ? "Shipping" : "Poštnina", o.shipping_cents ? eur(o.shipping_cents) : (en ? "free" : "brezplačno"))}
${o.cod_fee_cents ? line(en ? "COD fee" : "Odkupnina", eur(o.cod_fee_cents)) : ""}
${line(en ? "Total" : "Skupaj", eur(o.total_cents), true)}</table>`;
}

function address(o, en) {
  return `<p style="font-size:14px;line-height:1.6;margin:16px 0 0"><b>${en ? "Delivery to" : "Dostava na naslov"}:</b><br>
${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.zip)} ${esc(o.city)}${o.phone ? `<br>${esc(o.phone)}` : ""}</p>`;
}

/** Potrditev naročila kupcu (+ UPN QR pri predračunu). */
export async function sendOrderConfirmation(orderId) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const en = o.lang === "en";
  let pay = "";
  const attachments = [];
  if (o.payment === "proforma") {
    const { upnText } = await import("./upn");
    const { text, ref, due } = upnText({ amountCents: o.total_cents, number: o.number, name: o.name, street: o.address, city: `${o.zip} ${o.city}` });
    const L2 = { "Č": 0xc8, "č": 0xe8, "Š": 0xa9, "š": 0xb9, "Ž": 0xae, "ž": 0xbe, "Ć": 0xc6, "ć": 0xe6, "Đ": 0xd0, "đ": 0xf0 };
    const bytes = Uint8Array.from([...text].map((ch) => L2[ch] ?? (ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 63)));
    const png = await QRCode.toBuffer([{ data: bytes, mode: "byte" }], { errorCorrectionLevel: "M", version: 15, margin: 2, scale: 5 });
    attachments.push({ filename: `upn-qr-${o.number}.png`, content: png.toString("base64"), contentId: "upnqr" });
    pay = `<div style="margin:20px 0;padding:18px;border:2px solid #0a0a0a;border-radius:12px">
<b style="text-transform:uppercase">${en ? "Payment details" : "Plačilo po predračunu"}</b>
<p style="font-size:14px;color:#444;margin:6px 0 12px">${en ? "Scan the QR code in your mobile banking app — everything is filled in." : "Skeniraj QR kodo v mobilni banki — vsi podatki se izpolnijo sami."}</p>
<img src="cid:upnqr" width="200" height="200" alt="UPN QR" style="display:block;margin:0 auto 12px">
<table style="font-size:14px;line-height:1.7">
<tr><td style="color:#666;padding-right:14px">${en ? "Amount" : "Znesek"}</td><td><b>${eur(o.total_cents)}</b></td></tr>
<tr><td style="color:#666;padding-right:14px">${en ? "Payee" : "Prejemnik"}</td><td>${esc(COMPANY.short)}, ${esc(COMPANY.address)}</td></tr>
<tr><td style="color:#666;padding-right:14px">IBAN</td><td><b>${esc(COMPANY.iban)}</b> (${esc(COMPANY.bank)}, BIC ${esc(COMPANY.bic)})</td></tr>
<tr><td style="color:#666;padding-right:14px">${en ? "Reference" : "Sklic"}</td><td><b>${ref}</b></td></tr>
<tr><td style="color:#666;padding-right:14px">${en ? "Due" : "Rok plačila"}</td><td>${due}</td></tr></table>
<p style="font-size:13px;color:#444;margin:12px 0 0">${en ? "We ship as soon as the payment arrives." : "Paket pošljemo takoj, ko prejmemo plačilo."}</p></div>`;
  } else if (o.payment === "cod") {
    pay = `<p style="font-size:14px;margin:16px 0">${en ? "You pay the courier on delivery." : "Plačaš ob prevzemu paketa (po povzetju)."}</p>`;
  } else {
    pay = `<p style="font-size:14px;margin:16px 0">✅ ${en ? "Paid by card." : "Plačano s kartico."}</p>`;
  }
  const html = shell(en ? `Thank you! Order #${o.number}` : `Hvala! Naročilo #${o.number}`,
    `<p style="font-size:15px;line-height:1.6;margin:0">${en ? `Hi ${esc(o.name.split(" ")[0])}, we have received your order.` : `Živjo ${esc(o.name.split(" ")[0])}, tvoje naročilo smo prejeli.`}
${o.payment === "proforma" ? "" : en ? " We'll send it within 2 working days." : " Odpošljemo ga v 2 delovnih dneh."}</p>
${pay}${itemsTable(o, en)}
<p style="font-size:13px;color:#666">${en ? "Payment" : "Plačilo"}: ${esc((en ? PAY_EN : PAY)[o.payment] || o.payment)}</p>
${address(o, en)}`);
  await send({ to: o.email, subject: en ? `69SLAM order #${o.number}` : `69SLAM naročilo #${o.number}`, html, attachments: attachments.length ? attachments : undefined });
}

/** Obvestilo trgovini o novem naročilu. */
export async function sendAdminNotice(orderId) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const html = shell(`Novo naročilo #${o.number}`,
    `<p style="font-size:15px;margin:0 0 6px"><b>${esc(o.name)}</b> · ${esc(o.email)}${o.phone ? " · " + esc(o.phone) : ""}</p>
<p style="font-size:14px;margin:0 0 6px">Plačilo: <b>${esc(PAY[o.payment] || o.payment)}</b>${o.paid_at ? " · ✅ plačano" : ""}</p>
${itemsTable(o, false)}${address(o, false)}
<p style="margin:18px 0 0"><a href="${SITE}/admin" style="background:#0a0a0a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">Odpri v CMS</a></p>`);
  await send({ to: ADMIN, subject: `🛒 Novo naročilo #${o.number} — ${eur(o.total_cents)} (${PAY[o.payment] || o.payment})`, html });
}

/** Paket je na poti. */
export async function sendShipped(orderId) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const en = o.lang === "en";
  const track = o.tracking ? `<p style="font-size:15px;margin:16px 0">${en ? "Tracking number" : "Sledilna številka"}: <b>${esc(o.tracking)}</b><br>
<a href="https://sledenje.posta.si/" style="color:#FF5A1F;font-weight:700">${en ? "Track your parcel" : "Sledi paketu"} →</a></p>` : "";
  const html = shell(en ? "Your parcel is on its way 📦" : "Paket je na poti 📦",
    `<p style="font-size:15px;line-height:1.6;margin:0">${en ? `Hi ${esc(o.name.split(" ")[0])}, your order #${o.number} has been shipped with Pošta Slovenije.` : `Živjo ${esc(o.name.split(" ")[0])}, tvoje naročilo #${o.number} smo oddali Pošti Slovenije.`}
${o.payment === "cod" ? (en ? ` Please have ${eur(o.total_cents)} ready for the courier.` : ` Ob prevzemu pripravi ${eur(o.total_cents)}.`) : ""}</p>
${track}${itemsTable(o, en)}${address(o, en)}`);
  await send({ to: o.email, subject: en ? `69SLAM order #${o.number} shipped` : `69SLAM naročilo #${o.number} je na poti`, html });
}
