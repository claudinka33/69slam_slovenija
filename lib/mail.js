import { Resend } from "resend";
import QRCode from "qrcode";
import { db } from "./db";
import { COMPANY } from "./legal";
import { LOGO_WHITE } from "./brand";
import { tx } from "./i18n";

const FROM = process.env.MAIL_FROM || "69SLAM <narocila@69slam.si>";
const REPLY = process.env.MAIL_REPLY || "69slamslovenia@gmail.com";
const ADMIN = process.env.MAIL_ADMIN || "69slamslovenia@gmail.com";
export const SITE = process.env.SITE_URL || "https://69slam-slovenija.vercel.app";

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);
export const eur = (c) => (Number(c || 0) / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const PAY = { card: "Plačilna kartica", proforma: "Predračun (UPN)", cod: "Po povzetju" };
const PAY_EN = { card: "Card", proforma: "Bank transfer (pro-forma)", cod: "Cash on delivery" };
const PAY_HR = { card: "Platna kartica", proforma: "Predračun (UPN nalog)", cod: "Pouzećem" };
/** Jezik maila (sl / hr / en), privzeto sl. */
export const mailLang = (l) => (l === "en" || l === "hr" ? l : "sl");

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
  const L = mailLang(opt.lang);
  const t = (sl, e, hr) => tx(L, sl, e, hr);
  const pre = opt.pre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opt.pre)}</div>` : "";
  const trust = [["🚚", t("Brezplačna dostava nad 50 €", "Free shipping over 50 €", "Besplatna dostava iznad 50 €")], ["↩️", t("14 dni za vračilo", "14 days to return", "14 dana za povrat")], ["💳", t("Plačilo tudi po povzetju", "Cash on delivery available", "Moguće plaćanje pouzećem")]]
    .map(([i, t]) => `<td align="center" width="33%" style="padding:12px 6px;font-size:12px;font-weight:700;color:#0a0a0a"><div style="font-size:18px;margin-bottom:3px">${i}</div>${t}</td>`).join("");
  const nav = [[t("Spodnje perilo", "Underwear", "Donje rublje"), `${SITE}/${L}#shop`], [t("Kopalke", "Swimwear", "Kupaći kostimi"), `${SITE}/${L}/kopalke`], [t("Dostava in vračila", "Shipping & returns", "Dostava i povrat"), `${SITE}/${L}/info/dostava-in-placilo`]]
    .map(([t, u]) => `<a href="${u}" style="color:#0a0a0a;font-weight:800;text-decoration:none;text-transform:uppercase;font-size:12px;letter-spacing:.06em;margin:0 9px">${t}</a>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#0a0a0a">${pre}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0"><tr><td align="center" style="padding:0 10px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0a0a0a;padding:20px 28px">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><a href="${SITE}/${L}" style="text-decoration:none"><img src="${LOGO_WHITE}" width="174" height="24" alt="69SLAM" style="display:block;width:174px;height:auto;border:0;color:#fff;font-weight:900;font-size:24px"></a></td>
<td align="right" style="color:#9a9a9a;font-size:11px;font-weight:700;letter-spacing:.14em">${t("SLOVENIJA", "SLOVENIA", "SLOVENIJA")}</td></tr></table></td></tr>
<tr><td style="padding:30px 28px 26px">
${title ? `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">${title}</h1>` : ""}
${body}
</td></tr>
<tr><td style="border-top:1px solid #eee"><table width="100%" cellpadding="0" cellspacing="0"><tr>${trust}</tr></table></td></tr>
<tr><td align="center" style="padding:16px 20px 6px;background:#f5f5f7">${nav}</td></tr>
<tr><td style="padding:10px 28px 22px;background:#f5f5f7;color:#777;font-size:11.5px;line-height:1.6;text-align:center">
${t("Vprašanja? Samo odgovori na ta e-mail", "Questions? Just reply to this e-mail", "Pitanja? Samo odgovori na ovaj e-mail")} · ${esc(REPLY)} · tel. ${esc(COMPANY.phone)}<br>
${esc(COMPANY.name)} · ${esc(COMPANY.address)} · ${t("ID za DDV", "VAT ID", "PDV ID")} ${esc(COMPANY.vat)}${footerExtra}
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
function steps(active, lang) {
  const labels = tx(lang, ["Prejeto", "Na poti", "Dostavljeno"], ["Received", "Shipped", "Delivered"], ["Zaprimljeno", "Na putu", "Dostavljeno"]);
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px"><tr>${labels.map((l, i) => `<td align="center" width="33%">
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

function itemsTable(o, L) {
  const t = (sl, e, hr) => tx(L, sl, e, hr);
  const lang = mailLang(o.lang);
  const rows = o.items.map((it) => productRow({ img: it.img, name: it.name, url: it.slug ? `${SITE}/${lang}/p/${it.slug}` : "",
    sub: `${t("Velikost", "Size", "Veličina")} ${esc(it.size)} · ${it.qty}×${it.bundle_key ? " · Paket 3 (−15 %)" : ""}`, right: eur(it.price_cents * it.qty) })).join("");
  const line = (a, b, bold) => `<tr><td colspan="2" style="padding:5px 0;${bold ? "font-weight:900;font-size:17px;padding-top:10px" : "color:#666"}">${a}</td><td align="right" style="padding:5px 0;${bold ? "font-weight:900;font-size:17px;padding-top:10px" : ""}">${b}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:14px 0 4px">${rows}
<tr><td colspan="3" style="height:8px"></td></tr>
${line(t("Blago", "Subtotal", "Proizvodi"), eur(o.subtotal_cents))}
${o.discount_cents ? line(`${t("Koda za popust", "Discount code", "Kod za popust")} ${esc(o.coupon_code || "")}`, `<span style="color:#e63946">${t("vključen", "incl.", "uračunat")} −${eur(o.discount_cents)}</span>`) : ""}
${line(t("Poštnina", "Shipping", "Poštarina"), o.shipping_cents ? eur(o.shipping_cents) : `<span style="color:#06a77d;font-weight:700">${t("brezplačno", "free", "besplatno")}</span>`)}
${o.cod_fee_cents ? line(t("Odkupnina", "COD fee", "Naknada za pouzeće"), eur(o.cod_fee_cents)) : ""}
${line(t("Skupaj", "Total", "Ukupno"), eur(o.total_cents), true)}</table>`;
}

function address(o, L) {
  const t = (sl, e, hr) => tx(L, sl, e, hr);
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;background:#f5f5f7;border-radius:12px"><tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.6">
<b style="text-transform:uppercase;font-size:12px;letter-spacing:.06em;color:#666">${t("Dostava na naslov", "Delivery to", "Dostava na adresu")}</b><br>
${esc(o.name)}<br>${esc(o.address)}<br>${esc(o.zip)} ${esc(o.city)}${o.phone ? `<br>${esc(o.phone)}` : ""}
<br><span style="color:#666">${t("Pošta Slovenije · 1–2 delovna dneva", "Pošta Slovenije · 1–2 working days", "Pošta Slovenije · 1–2 radna dana")}</span></td></tr></table>`;
}

/** Potrditev naročila kupcu (+ UPN QR pri predračunu). */
export async function sendOrderConfirmation(orderId, extra = []) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const { html, attachments, subject } = await renderOrderConfirmation(o, extra.length > 0);
  const all = [...attachments, ...extra];
  await send({ to: o.email, subject, html, attachments: all.length ? all : undefined });
}

/** HTML potrditve (tudi za predogled v CMS). */
export async function renderOrderConfirmation(o, hasProformaPdf = false) {
  const L = mailLang(o.lang);
  const t = (sl, e, hr) => tx(L, sl, e, hr);
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
<b style="text-transform:uppercase">${t("Plačilo po predračunu", "Payment details", "Plaćanje po predračunu")}</b>
<p style="font-size:14px;color:#444;margin:6px 0 12px">${t("Skeniraj QR kodo v mobilni banki — vsi podatki se izpolnijo sami.", "Scan the QR code in your mobile banking app — everything is filled in.", "Skeniraj QR kod u mobilnom bankarstvu — svi se podaci ispune sami.")}</p>
<img src="cid:upnqr" width="200" height="200" alt="UPN QR" style="display:block;margin:0 auto 12px">
<table style="font-size:14px;line-height:1.7">
<tr><td style="color:#666;padding-right:14px">${t("Znesek", "Amount", "Iznos")}</td><td><b>${eur(o.total_cents)}</b></td></tr>
<tr><td style="color:#666;padding-right:14px">${t("Prejemnik", "Payee", "Primatelj")}</td><td>${esc(COMPANY.short)}, ${esc(COMPANY.address)}</td></tr>
<tr><td style="color:#666;padding-right:14px">IBAN</td><td><b>${esc(COMPANY.iban)}</b> (${esc(COMPANY.bank)}, BIC ${esc(COMPANY.bic)})</td></tr>
<tr><td style="color:#666;padding-right:14px">${t("Sklic", "Reference", "Poziv na broj")}</td><td><b>${ref}</b></td></tr>
<tr><td style="color:#666;padding-right:14px">${t("Rok plačila", "Due", "Rok plaćanja")}</td><td>${due}</td></tr></table>
<p style="font-size:13px;color:#444;margin:12px 0 0">${t("Paket pošljemo takoj, ko prejmemo plačilo.", "We ship as soon as the payment arrives.", "Paket šaljemo čim primimo uplatu.")}${hasProformaPdf ? t(" Uradni predračun (PDF) je v prilogi.", " The official pro-forma invoice (PDF) is attached.", " Službeni predračun (PDF) nalazi se u privitku.") : ""}</p></div>`;
  } else if (o.payment === "cod") {
    pay = `<p style="font-size:14px;margin:16px 0">${t("Plačaš ob prevzemu paketa (po povzetju).", "You pay the courier on delivery.", "Plaćaš pri preuzimanju paketa (pouzećem).")}</p>`;
  } else {
    pay = `<p style="font-size:14px;margin:16px 0">✅ ${t("Plačano s kartico.", "Paid by card.", "Plaćeno karticom.")}</p>`;
  }
  const first = esc(o.name.split(" ")[0]);
  const html = shell(t(`Hvala, ${first}! 🙌`, `Thank you, ${first}! 🙌`, `Hvala, ${first}! 🙌`),
    `<p style="font-size:15px;line-height:1.65;margin:0">${t(`Tvoje naročilo <b>#${o.number}</b> smo prejeli.`, `We've received your order <b>#${o.number}</b>.`, `Zaprimili smo tvoju narudžbu <b>#${o.number}</b>.`)}
${o.payment === "proforma" ? t(" Odpošljemo ga takoj, ko prejmemo plačilo.", " We'll ship it as soon as your payment arrives.", " Šaljemo je čim primimo uplatu.") : t(" Zapakiramo ga in odpošljemo v 2 delovnih dneh.", " We'll pack it and ship it within 2 working days.", " Zapakirat ćemo je i poslati u roku od 2 radna dana.")}</p>
${steps(0, L)}${pay}${itemsTable(o, L)}
<p style="font-size:13px;color:#666;margin:8px 0 0">${t("Plačilo", "Payment", "Plaćanje")}: ${esc(tx(L, PAY, PAY_EN, PAY_HR)[o.payment] || o.payment)}</p>
${address(o, L)}
<p style="font-size:13px;color:#666;line-height:1.6;margin:18px 0 0">${t("Velikost ni prava? V 14 dneh jo lahko zamenjaš ali vrneš — samo odgovori na ta e-mail.", "Wrong size? You have 14 days to exchange or return — just reply to this e-mail.", "Veličina ti ne odgovara? U roku od 14 dana možeš je zamijeniti ili vratiti — samo odgovori na ovaj e-mail.")}</p>`,
    "", { lang: L, pre: t(`Naročilo #${o.number} je prejeto — hvala!`, `Order #${o.number} received — thank you!`, `Narudžba #${o.number} je zaprimljena — hvala!`) });
  return { html, attachments, subject: t(`Naročilo #${o.number} je potrjeno ✅`, `Order #${o.number} confirmed ✅`, `Narudžba #${o.number} je potvrđena ✅`) };
}

/** Obvestilo trgovini o novem naročilu. */
export async function sendAdminNotice(orderId) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const html = shell(`Novo naročilo #${o.number}`,
    `<p style="font-size:15px;margin:0 0 6px"><b>${esc(o.name)}</b> · ${esc(o.email)}${o.phone ? " · " + esc(o.phone) : ""}</p>
<p style="font-size:14px;margin:0 0 6px">Plačilo: <b>${esc(PAY[o.payment] || o.payment)}</b>${o.paid_at ? " · ✅ plačano" : ""}</p>
${itemsTable(o, "sl")}${address(o, "sl")}
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
  const L = mailLang(o.lang);
  const t = (sl, e, hr) => tx(L, sl, e, hr);
  const track = o.tracking ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:2px solid #0a0a0a;border-radius:12px"><tr><td style="padding:16px;text-align:center">
<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#666">${t("Sledilna številka", "Tracking number", "Broj za praćenje")}</div>
<div style="font-size:20px;font-weight:900;letter-spacing:.04em;margin:4px 0 0">${esc(o.tracking)}</div></td></tr></table>
${mailButton("https://moja.posta.si/tracking", t("Sledi paketu", "Track your parcel", "Prati paket"))}
<p style="font-size:13px;color:#666;margin:4px 0 0">${t("Na strani Pošte Slovenije vpiši zgornjo sledilno številko.", "On the Pošta Slovenije page, enter the tracking number above.", "Na stranici Pošte Slovenije upiši gornji broj za praćenje.")}</p>` : "";
  const first = esc(o.name.split(" ")[0]);
  const html = shell(t("Paket je na poti 📦", "Your parcel is on its way 📦", "Paket je na putu 📦"),
    `<p style="font-size:15px;line-height:1.65;margin:0">${t(`Živjo ${first}, tvoje naročilo <b>#${o.number}</b> smo oddali Pošti Slovenije. Običajno prispe v 1–2 delovnih dneh.`, `Hi ${first}, your order <b>#${o.number}</b> has been handed to Pošta Slovenije and usually arrives in 1–2 working days.`, `Bok ${first}, tvoju narudžbu <b>#${o.number}</b> predali smo Pošti Slovenije. Obično stiže za 1–2 radna dana.`)}
${o.payment === "cod" ? t(` Ob prevzemu pripravi <b>${eur(o.total_cents)}</b>.`, ` Please have <b>${eur(o.total_cents)}</b> ready for the courier.`, ` Pri preuzimanju pripremi <b>${eur(o.total_cents)}</b>.`) : ""}</p>
${steps(1, L)}${track}${itemsTable(o, L)}${address(o, L)}
${invoiceFile ? `<p style="font-size:13px;color:#666;margin:16px 0 0">📎 ${t("Račun je v prilogi tega maila (PDF). Račune pošiljamo samo elektronsko — tako varujemo okolje.", "Your invoice is attached to this e-mail (PDF). We only send invoices electronically to protect the environment.", "Račun se nalazi u privitku ovog maila (PDF). Račune šaljemo samo elektronički — tako čuvamo okoliš.")} 🌱</p>` : ""}`, "", { lang: L, pre: t(`Naročilo #${o.number} je na poti`, `Order #${o.number} is on its way`, `Narudžba #${o.number} je na putu`) });
  return { html, subject: t(`Tvoje naročilo #${o.number} je na poti 📦`, `Your 69SLAM order #${o.number} is on its way 📦`, `Tvoja narudžba #${o.number} je na putu 📦`) };
}
