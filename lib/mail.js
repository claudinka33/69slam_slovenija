import { Resend } from "resend";
import QRCode from "qrcode";
import { db } from "./db";
import { COMPANY } from "./legal";
import { LOGO_WHITE } from "./brand";

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

const absImg = (u) => (!u ? "" : u.startsWith("/") ? SITE + u : u);

/** Skupni okvir vseh mailov (logo, trust bar, noga). */
export function shell(title, body, footerExtra = "", opt = {}) {
  const en = opt.lang === "en";
  const pre = opt.pre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opt.pre)}</div>` : "";
  const trust = [["🚚", en ? "Free shipping over 50 €" : "Brezplačna dostava nad 50 €"], ["↩️", en ? "14 days to return" : "14 dni za vračilo"], ["💳", en ? "Cash on delivery available" : "Plačilo tudi po povzetju"]]
    .map(([i, t]) => `<td align="center" width="33%" style="padding:12px 6px;font-size:12px;font-weight:700;color:#0a0a0a"><div style="font-size:18px;margin-bottom:3px">${i}</div>${t}</td>`).join("");
  const nav = [[en ? "Underwear" : "Spodnje perilo", `${SITE}/${en ? "en" : "sl"}#shop`], [en ? "Swimwear" : "Kopalke", `${SITE}/${en ? "en" : "sl"}/kopalke`], [en ? "Shipping & returns" : "Dostava in vračila", `${SITE}/${en ? "en" : "sl"}/info/dostava-in-placilo`]]
    .map(([t, u]) => `<a href="${u}" style="color:#0a0a0a;font-weight:800;text-decoration:none;text-transform:uppercase;font-size:12px;letter-spacing:.06em;margin:0 9px">${t}</a>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a">${pre}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0"><tr><td align="center" style="padding:0 10px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0a0a0a;padding:20px 28px">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><a href="${SITE}/${en ? "en" : "sl"}" style="text-decoration:none"><img src="${LOGO_WHITE}" width="174" height="24" alt="69SLAM" style="display:block;width:174px;height:auto;border:0;color:#fff;font-weight:900;font-size:24px"></a></td>
<td align="right" style="color:#9a9a9a;font-size:11px;font-weight:700;letter-spacing:.14em">${en ? "SLOVENIA" : "SLOVENIJA"}</td></tr></table></td></tr>
<tr><td style="padding:30px 28px 26px">
${title ? `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">${title}</h1>` : ""}
${body}
</td></tr>
<tr><td style="border-top:1px solid #eee"><table width="100%" cellpadding="0" cellspacing="0"><tr>${trust}</tr></table></td></tr>
<tr><td align="center" style="padding:16px 20px 6px;background:#f5f5f7">${nav}</td></tr>
<tr><td style="padding:10px 28px 22px;background:#f5f5f7;color:#777;font-size:11.5px;line-height:1.6;text-align:center">
${en ? "Questions? Just reply to this e-mail" : "Vprašanja? Samo odgovori na ta e-mail"} · ${esc(REPLY)} · tel. ${esc(COMPANY.phone)}<br>
${esc(COMPANY.name)} · ${esc(COMPANY.address)} · ID za DDV ${esc(COMPANY.vat)}${footerExtra}
</td></tr></table></td></tr></table></body></html>`;
}

/** Gumb v mailu. */
export const mailButton = (url, text, color = "#FF5A1F") => `<table cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="background:${color};border-radius:12px">
<a href="${url}" style="display:inline-block;padding:15px 26px;color:#fff;text-decoration:none;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:14px">${text}</a></td></tr></table>`;

/** Kartica artikla (slika + ime + opis). */
export function productRow({ img, name, url, sub = "", right = "" }) {
  const a = (x) => (url ? `<a href="${url}" style="color:#0a0a0a;text-decoration:none">${x}</a>` : x);
  return `<tr><td width="76" style="padding:10px 0;border-bottom:1px solid #eee">${img ? a(`<img src="${esc(absImg(img))}" width="64" height="80" style="width:64px;height:80px;object-fit:cover;border-radius:10px;display:block;background:#f5f5f7" alt="">`) : ""}</td>
<td style="padding:10px 10px;border-bottom:1px solid #eee;font-size:14px;line-height:1.4">${a(`<b style="text-transform:uppercase;font-weight:800">${esc(name)}</b>`)}${sub ? `<br><span style="color:#666;font-size:12.5px">${sub}</span>` : ""}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;white-space:nowrap;font-weight:700">${right}</td></tr>`;
}

/** Napredek naročila: 0 = prejeto, 1 = na poti, 2 = dostavljeno. */
function steps(active, en) {
  const L = en ? ["Received", "Shipped", "Delivered"] : ["Prejeto", "Na poti", "Dostavljeno"];
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr>${L.map((l, i) => `<td align="center" width="33%">
<div style="width:30px;height:30px;line-height:30px;border-radius:50%;margin:0 auto;font-weight:900;font-size:14px;${i <= active ? "background:#06d6a0;color:#fff" : "background:#eee;color:#999"}">${i < active ? "✓" : i + 1}</div>
<div style="font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin-top:6px;color:${i <= active ? "#0a0a0a" : "#999"}">${l}</div></td>`).join("")}</tr></table>`;
}

async function loadOrder(id) {
  const sql = db();
  const [o] = await sql`SELECT * FROM orders WHERE id = ${id}`;
  if (!o) return null;
  const items = await sql`SELECT i.name, i.size, i.qty, i.price_cents, i.bundle_key, v.code FROM order_items i LEFT JOIN variants v ON v.sku = i.sku WHERE i.order_id = ${id} ORDER BY i.id`;
  try {
    const { primeCatalog, getAnyProduct } = await import("./catalog");
    await primeCatalog();
    for (const it of items) { const p = it.code ? getAnyProduct(it.code) : null; it.img = p?.img || ""; it.slug = p?.slug || ""; }
  } catch {}
  return { ...o, items };
}

function itemsTable(o, en) {
  const lang = o.lang === "en" ? "en" : "sl";
  const rows = o.items.map((it) => productRow({ img: it.img, name: it.name, url: it.slug ? `${SITE}/${lang}/p/${it.slug}` : "",
    sub: `${en ? "Size" : "Velikost"} ${esc(it.size)} · ${it.qty}×${it.bundle_key ? " · Paket 3 (−15 %)" : ""}`, right: eur(it.price_cents * it.qty) })).join("");
  const line = (a, b, bold) => `<tr><td colspan="2" style="padding:5px 0;${bold ? "font-weight:900;font-size:17px;padding-top:10px" : "color:#666"}">${a}</td><td align="right" style="padding:5px 0;${bold ? "font-weight:900;font-size:17px;padding-top:10px" : ""}">${b}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:14px 0 4px">${rows}
<tr><td colspan="3" style="height:8px"></td></tr>
${line(en ? "Subtotal" : "Blago", eur(o.subtotal_cents))}
${o.discount_cents ? line(`${en ? "Discount code" : "Koda za popust"} ${esc(o.coupon_code || "")}`, `<span style="color:#e63946">${en ? "incl." : "vključen"} −${eur(o.discount_cents)}</span>`) : ""}
${line(en ? "Shipping" : "Poštnina", o.shipping_cents ? eur(o.shipping_cents) : `<span style="color:#06a77d;font-weight:700">${en ? "free" : "brezplačno"}</span>`)}
${o.cod_fee_cents ? line(en ? "COD fee" : "Odkupnina", eur(o.cod_fee_cents)) : ""}
${line(en ? "Total" : "Skupaj", eur(o.total_cents), true)}</table>`;
}

function address(o, en) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#f5f5f7;border-radius:12px"><tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.6">
<b style="text-transform:uppercase;font-size:12px;letter-spacing:.06em;color:#666">${en ? "Delivery to" : "Dostava na naslov"}</b><br>
${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.zip)} ${esc(o.city)}${o.phone ? `<br>${esc(o.phone)}` : ""}
<br><span style="color:#666">${en ? "Pošta Slovenije · 1–2 working days" : "Pošta Slovenije · 1–2 delovna dneva"}</span></td></tr></table>`;
}

/** Potrditev naročila kupcu (+ UPN QR pri predračunu). */
export async function sendOrderConfirmation(orderId) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const { html, attachments, subject } = await renderOrderConfirmation(o);
  await send({ to: o.email, subject, html, attachments: attachments.length ? attachments : undefined });
}

/** HTML potrditve (tudi za predogled v CMS). */
export async function renderOrderConfirmation(o) {
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
  const first = esc(o.name.split(" ")[0]);
  const html = shell(en ? `Thank you, ${first}! 🙌` : `Hvala, ${first}! 🙌`,
    `<p style="font-size:15px;line-height:1.65;margin:0">${en ? `We've received your order <b>#${o.number}</b>.` : `Tvoje naročilo <b>#${o.number}</b> smo prejeli.`}
${o.payment === "proforma" ? (en ? " We'll ship it as soon as your payment arrives." : " Odpošljemo ga takoj, ko prejmemo plačilo.") : en ? " We'll pack it and ship it within 2 working days." : " Zapakiramo ga in odpošljemo v 2 delovnih dneh."}</p>
${steps(0, en)}${pay}${itemsTable(o, en)}
<p style="font-size:13px;color:#666;margin:8px 0 0">${en ? "Payment" : "Plačilo"}: ${esc((en ? PAY_EN : PAY)[o.payment] || o.payment)}</p>
${address(o, en)}
<p style="font-size:13px;color:#666;line-height:1.6;margin:18px 0 0">${en ? "Wrong size? You have 14 days to exchange or return — just reply to this e-mail." : "Velikost ni prava? V 14 dneh jo lahko zamenjaš ali vrneš — samo odgovori na ta e-mail."}</p>`,
    "", { lang: o.lang, pre: en ? `Order #${o.number} received — thank you!` : `Naročilo #${o.number} je prejeto — hvala!` });
  return { html, attachments, subject: en ? `Order #${o.number} confirmed ✅` : `Naročilo #${o.number} je potrjeno ✅` };
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
export async function sendShipped(orderId, attachments) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const { html, subject } = renderShipped(o, attachments?.length ? attachments[0].filename : null);
  return send({ to: o.email, subject, html, attachments: attachments?.length ? attachments : undefined });
}

export function renderShipped(o, invoiceFile = null) {
  const en = o.lang === "en";
  const track = o.tracking ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:2px solid #0a0a0a;border-radius:12px"><tr><td style="padding:16px;text-align:center">
<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#666">${en ? "Tracking number" : "Sledilna številka"}</div>
<div style="font-size:20px;font-weight:900;letter-spacing:.04em;margin:4px 0 0">${esc(o.tracking)}</div></td></tr></table>
${mailButton("https://moja.posta.si/tracking", en ? "Track your parcel" : "Sledi paketu")}
<p style="font-size:13px;color:#666;margin:4px 0 0">${en ? "On the Pošta Slovenije page, enter the tracking number above." : "Na strani Pošte Slovenije vpiši zgornjo sledilno številko."}</p>` : "";
  const html = shell(en ? "Your parcel is on its way 📦" : "Paket je na poti 📦",
    `<p style="font-size:15px;line-height:1.65;margin:0">${en ? `Hi ${esc(o.name.split(" ")[0])}, your order <b>#${o.number}</b> has been handed to Pošta Slovenije and usually arrives in 1–2 working days.` : `Živjo ${esc(o.name.split(" ")[0])}, tvoje naročilo <b>#${o.number}</b> smo oddali Pošti Slovenije. Običajno prispe v 1–2 delovnih dneh.`}
${o.payment === "cod" ? (en ? ` Please have <b>${eur(o.total_cents)}</b> ready for the courier.` : ` Ob prevzemu pripravi <b>${eur(o.total_cents)}</b>.`) : ""}</p>
${steps(1, en)}${track}${itemsTable(o, en)}${address(o, en)}
${invoiceFile ? `<p style="font-size:13px;color:#666;margin:16px 0 0">📎 ${en ? "Your invoice is attached to this e-mail (PDF). We only send invoices electronically to protect the environment." : "Račun je v prilogi tega maila (PDF). Račune pošiljamo samo elektronsko — tako varujemo okolje."} 🌱</p>` : ""}`, "", { lang: o.lang, pre: en ? `Order #${o.number} is on its way` : `Naročilo #${o.number} je na poti` });
  return { html, subject: en ? `Your 69SLAM order #${o.number} is on its way 📦` : `Tvoje naročilo #${o.number} je na poti 📦` };
}
