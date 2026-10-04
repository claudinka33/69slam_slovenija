import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { COMPANY } from "./legal";

/* ---------- nastavitve oblike računa (CMS → Računi → Nastavitve) ---------- */
export const INV_DEFAULTS = {
  start: 1000,              // prva številka v letu (2026-1000)
  due_days: 8,              // rok plačila za TRR
  place: "Šmarje pri Jelšah",
  accent: "#0a0a0a",        // barva glave tabele in črt
  prepared_by: "Claudia Seidl",
  email: "info@69slam.si",
  web: "www.69slam.si",
  note: "",                 // privzeta opomba na vsakem računu
  footer: "Hvala za zaupanje! Račun je izdan v elektronski obliki in je veljaven brez podpisa in žiga.",
  show_logo: true,
};
export async function getInvSettings() {
  const [r] = await db()`SELECT value FROM settings WHERE key = 'invoice'`;
  return { ...INV_DEFAULTS, ...(r?.value || {}) };
}
export async function saveInvSettings(v) {
  const cur = await getInvSettings();
  const clean = { ...cur };
  for (const k of Object.keys(INV_DEFAULTS)) if (v[k] !== undefined) clean[k] = v[k];
  clean.start = Math.max(1, parseInt(clean.start, 10) || 1000);
  clean.due_days = Math.max(0, Math.min(90, parseInt(clean.due_days, 10) || 0));
  if (!/^#[0-9a-f]{6}$/i.test(clean.accent)) clean.accent = INV_DEFAULTS.accent;
  await db()`INSERT INTO settings (key, value) VALUES ('invoice', ${JSON.stringify(clean)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  return clean;
}

export const PAY_LABEL = { trr: "Nakazilo na TRR", gotovina: "Gotovina", kartica: "Plačilna kartica", povzetje: "Po povzetju", placano: "Že plačano" };
export const eurS = (c) => (Number(c || 0) / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const d8 = (d) => { const x = new Date(d); return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`; };

/** Izračun: postavke [{desc, code, qty, unit, price, disc, vat}] — cene z DDV (gross) ali brez (net). Vse v centih. */
export function computeInvoice(items, gross) {
  const lines = [];
  const groups = {};
  for (const it of items || []) {
    const qty = Number(String(it.qty ?? 1).replace(",", ".")) || 0;
    const price = Number(String(it.price ?? 0).replace(",", ".")) || 0;
    const disc = Math.min(100, Math.max(0, Number(String(it.disc ?? 0).replace(",", ".")) || 0));
    const vat = Number(String(it.vat ?? 22).replace(",", ".")) || 0;
    const amount = Math.round(qty * price * 100 * (1 - disc / 100)); // v centih, z ali brez DDV
    lines.push({ ...it, qty, price, disc, vat, amount });
    const g = (groups[vat] = groups[vat] || { rate: vat, base: 0, vat: 0, gross: 0, sum: 0 });
    g.sum += amount;
  }
  let net = 0, vatT = 0, total = 0;
  for (const g of Object.values(groups)) {
    if (gross) { g.gross = g.sum; g.base = Math.round(g.sum / (1 + g.rate / 100)); g.vat = g.gross - g.base; }
    else { g.base = g.sum; g.vat = Math.round(g.sum * g.rate / 100); g.gross = g.base + g.vat; }
    net += g.base; vatT += g.vat; total += g.gross;
  }
  return { lines, groups: Object.values(groups).sort((a, b) => b.rate - a.rate), net, vat: vatT, total };
}

/** Naslednja številka v letu: 2026-1000, 2026-1001 … */
async function nextNumber(sql, year, start) {
  const [r] = await sql`SELECT MAX(seq)::int AS m FROM invoices WHERE year = ${year}`;
  return r?.m ? r.m + 1 : start;
}

/** Izda račun (dodeli številko). data: {customer:{name,address,zip_city,country,vat,email}, items, gross, payment, due_days, notes, order_id, kind, ref} */
export async function issueInvoice(data) {
  const sql = db();
  const s = await getInvSettings();
  const now = new Date();
  const year = now.getFullYear();
  const calc = computeInvoice(data.items, !!data.gross);
  const c = data.customer || {};
  const dueDays = data.due_days != null ? Number(data.due_days) : ["trr"].includes(data.payment) ? s.due_days : 0;
  const due = new Date(now.getTime() + dueDays * 86400000);
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = await nextNumber(sql, year, s.start);
    try {
      const [inv] = await sql`INSERT INTO invoices (number, year, seq, kind, ref_number, order_id, issued_at, service_date, due_date, place,
          customer_name, customer_address, customer_zip_city, customer_country, customer_vat, customer_email,
          items, prices_gross, payment, notes, net_cents, vat_cents, total_cents, prepared_by)
        VALUES (${`${year}-${seq}`}, ${year}, ${seq}, ${data.kind || "racun"}, ${data.ref || null}, ${data.order_id || null}, ${now.toISOString()},
          ${data.service_date || now.toISOString().slice(0, 10)}, ${due.toISOString().slice(0, 10)}, ${data.place || s.place},
          ${String(c.name || "").slice(0, 200)}, ${c.address || null}, ${c.zip_city || null}, ${c.country || "Slovenija"}, ${c.vat || null}, ${c.email || null},
          ${JSON.stringify(calc.lines.map(({ amount, ...x }) => x))}::jsonb, ${!!data.gross}, ${data.payment || "trr"}, ${data.notes || null},
          ${calc.net}, ${calc.vat}, ${calc.total}, ${data.prepared_by || s.prepared_by})
        RETURNING *`;
      return inv;
    } catch (e) {
      if (!String(e?.message || e).includes("duplicate")) throw e; // druga številka hkrati → poskusi znova
    }
  }
  throw new Error("Številke računa ni bilo mogoče dodeliti.");
}

/** Račun iz spletnega naročila (enkrat na naročilo). */
export async function invoiceFromOrder(orderId) {
  const sql = db();
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) return null;
  const [had] = await sql`SELECT * FROM invoices WHERE order_id = ${orderId} AND kind = 'racun' AND status <> 'storniran' ORDER BY id LIMIT 1`;
  if (had) return had;
  const items = await sql`SELECT sku, name, size, qty, price_cents, bundle_key FROM order_items WHERE order_id = ${orderId} ORDER BY id`;
  const lines = items.map((it) => ({ code: it.sku, desc: `${it.name} (vel. ${it.size})${it.bundle_key ? " · Paket 3" : ""}`, qty: it.qty, unit: "kos", price: it.price_cents / 100, disc: 0, vat: 22 }));
  if (o.shipping_cents) lines.push({ code: "", desc: "Poštnina (Pošta Slovenije)", qty: 1, unit: "kos", price: o.shipping_cents / 100, disc: 0, vat: 22 });
  if (o.cod_fee_cents) lines.push({ code: "", desc: "Strošek plačila po povzetju", qty: 1, unit: "kos", price: o.cod_fee_cents / 100, disc: 0, vat: 22 });
  const payment = o.payment === "card" ? "kartica" : o.payment === "cod" ? "povzetje" : "trr";
  const paidNote = o.payment === "card" ? "Plačano s plačilno kartico ob naročilu." : o.payment === "cod" ? "Znesek plačate ob prevzemu paketa (po povzetju)." : o.paid_at ? "Plačano po predračunu." : "";
  return issueInvoice({
    order_id: orderId, gross: true, payment, due_days: 0,
    customer: { name: o.name, address: o.address, zip_city: `${o.zip} ${o.city}`, country: "Slovenija", email: o.email },
    items: lines,
    notes: [`Spletno naročilo #${o.number}${o.coupon_code ? ` · koda za popust ${o.coupon_code}` : ""}.`, paidNote].filter(Boolean).join(" "),
  });
}

/* ---------- PDF ---------- */
const FONT = (n) => path.join(process.cwd(), "assets/fonts", n);

export async function invoicePdf(inv, s0) {
  const s = s0 || (await getInvSettings());
  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: `Račun ${inv.number}`, Author: COMPANY.short } });
  doc.registerFont("R", FONT("Poppins-Regular.ttf"));
  doc.registerFont("M", FONT("Poppins-Medium.ttf"));
  doc.registerFont("B", FONT("Poppins-Bold.ttf"));
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  const A = s.accent || "#0a0a0a";
  const W = doc.page.width, L = 42, R = W - 42, CW = R - L;
  const gray = "#6b6b6b", line = "#e0e0e0", soft = "#f5f5f7";
  const credit = inv.kind === "dobropis";
  const calc = computeInvoice(inv.items, inv.prices_gross);

  // ---- glava: logo + podjetje
  const logo = path.join(process.cwd(), "public/brand/freestyle-freak.png");
  if (s.show_logo !== false && fs.existsSync(logo)) doc.image(logo, L, 40, { width: 170 });
  doc.font("B").fontSize(9.5).fillColor("#0a0a0a").text(COMPANY.name.toUpperCase(), 300, 40, { width: R - 300, align: "right" });
  doc.font("R").fontSize(8.5).fillColor(gray)
    .text(`${COMPANY.street}, ${COMPANY.city}`, { width: R - 300, align: "right" })
    .text(`ID za DDV: ${COMPANY.vat} · Matična št.: ${COMPANY.reg}`, { width: R - 300, align: "right" })
    .text(`${s.email} · ${COMPANY.phone} · ${s.web}`, { width: R - 300, align: "right" });
  doc.moveTo(L, 112).lineTo(R, 112).lineWidth(2).strokeColor(A).stroke();

  // ---- naslov + številka
  doc.font("B").fontSize(22).fillColor("#0a0a0a").text(credit ? "DOBROPIS" : "RAČUN", L, 128);
  doc.font("M").fontSize(12).fillColor(A).text(`št. ${inv.number}`, L, 156);
  if (credit && inv.ref_number) doc.font("R").fontSize(8.5).fillColor(gray).text(`k računu št. ${inv.ref_number}`, L, 174);

  // ---- kupec (siva škatla)
  const bx = L, by = 196, bw = 270, bh = 104;
  doc.roundedRect(bx, by, bw, bh, 10).fill(soft);
  doc.font("R").fontSize(7.5).fillColor(gray).text("KUPEC", bx + 14, by + 12);
  doc.font("B").fontSize(10).fillColor("#0a0a0a").text(inv.customer_name || "", bx + 14, by + 24, { width: bw - 28 });
  doc.font("R").fontSize(9).fillColor("#0a0a0a");
  if (inv.customer_address) doc.text(inv.customer_address, { width: bw - 28 });
  if (inv.customer_zip_city) doc.text(`${inv.customer_zip_city}${inv.customer_country && inv.customer_country !== "Slovenija" ? ", " + inv.customer_country : ""}`, { width: bw - 28 });
  if (inv.customer_vat) doc.font("M").text(`ID za DDV: ${inv.customer_vat}`, { width: bw - 28 });

  // ---- datumi (desno)
  const kv = [["Datum izdaje", d8(inv.issued_at)], ["Datum storitve / dobave", d8(inv.service_date)],
    ["Rok plačila", d8(inv.due_date)], ["Način plačila", PAY_LABEL[inv.payment] || inv.payment], ["Kraj izdaje", inv.place || s.place]];
  let ky = by + 4;
  for (const [k, v] of kv) {
    doc.font("R").fontSize(8.5).fillColor(gray).text(k, 330, ky, { width: 140 });
    doc.font("M").fontSize(8.5).fillColor("#0a0a0a").text(v, 470, ky, { width: R - 470, align: "right" });
    ky += 17;
  }

  // ---- tabela postavk
  const cols = [
    { k: "#", w: 22, a: "left" }, { k: "Opis", w: 206, a: "left" }, { k: "Kol.", w: 36, a: "right" }, { k: "EM", w: 28, a: "left" },
    { k: inv.prices_gross ? "Cena z DDV" : "Cena", w: 62, a: "right" }, { k: "Pop. %", w: 40, a: "right" }, { k: "DDV %", w: 38, a: "right" },
    { k: inv.prices_gross ? "Vrednost z DDV" : "Vrednost", w: CW - 16 - 432, a: "right" },
  ];
  let y = by + bh + 26;
  doc.roundedRect(L, y, CW, 22, 6).fill(A);
  let x = L + 8;
  doc.font("B").fontSize(7.5).fillColor("#ffffff");
  for (const c of cols) { doc.text(c.k.toUpperCase(), x, y + 7, { width: c.w - 6, align: c.a }); x += c.w; }
  y += 28;
  calc.lines.forEach((l, i) => {
    const desc = `${l.desc || ""}${l.code ? `\n${l.code}` : ""}`;
    doc.font("R").fontSize(8.5);
    const h = Math.max(16, doc.heightOfString(desc, { width: cols[1].w - 6 }) + 6);
    if (y + h > doc.page.height - 200) { doc.addPage(); y = 50; }
    const vals = [String(i + 1), null, String(l.qty).replace(".", ","), l.unit || "kos", eurS(Math.round(l.price * 100)), l.disc ? String(l.disc).replace(".", ",") : "", String(l.vat).replace(".", ","), eurS(l.amount)];
    x = L + 8;
    cols.forEach((c, ci) => {
      if (ci === 1) {
        doc.font("M").fontSize(8.5).fillColor("#0a0a0a").text(l.desc || "", x, y, { width: c.w - 6 });
        if (l.code) doc.font("R").fontSize(7.5).fillColor(gray).text(l.code, x, doc.y, { width: c.w - 6 });
      } else doc.font(ci === 7 ? "M" : "R").fontSize(8.5).fillColor("#0a0a0a").text(vals[ci], x, y, { width: c.w - 6, align: c.a });
      x += c.w;
    });
    y += h + 4;
    doc.moveTo(L, y - 3).lineTo(R, y - 3).lineWidth(0.5).strokeColor(line).stroke();
  });

  // ---- rekapitulacija DDV (levo) + skupaj (desno)
  y += 10;
  const ty = y;
  doc.font("B").fontSize(7.5).fillColor(gray).text("STOPNJA DDV", L, y, { width: 80 }).text("OSNOVA", L + 85, y, { width: 70, align: "right" }).text("DDV", L + 160, y, { width: 60, align: "right" });
  y += 13;
  for (const g of calc.groups) {
    doc.font("R").fontSize(8.5).fillColor("#0a0a0a").text(`${String(g.rate).replace(".", ",")} %`, L, y, { width: 80 })
      .text(eurS(g.base), L + 85, y, { width: 70, align: "right" }).text(eurS(g.vat), L + 160, y, { width: 60, align: "right" });
    y += 13;
  }
  let ry = ty;
  const row = (k, v, big) => {
    doc.font(big ? "B" : "R").fontSize(big ? 11 : 9).fillColor("#0a0a0a").text(k, 330, ry, { width: 130 }).text(`${v} €`, 460, ry, { width: R - 460, align: "right" });
    ry += big ? 20 : 15;
  };
  row("Skupaj brez DDV", eurS(calc.net));
  row("DDV", eurS(calc.vat));
  ry += 4;
  doc.roundedRect(322, ry - 6, R - 322, 30, 8).fill(soft);
  row(credit ? "Za vračilo" : "Za plačilo", eurS(calc.total), true);
  y = Math.max(y, ry) + 18;

  // ---- plačilo + opombe
  const ref = `SI00 ${String(inv.number).replace(/\D/g, "")}`;
  doc.font("R").fontSize(8.5).fillColor("#0a0a0a");
  if (inv.payment === "trr" && !credit) {
    doc.text(`Prosimo, da znesek poravnate do ${d8(inv.due_date)} na TRR `, L, y, { continued: true, width: CW })
      .font("B").text(`${COMPANY.iban}`, { continued: true }).font("R").text(` (${COMPANY.bank}, BIC ${COMPANY.bic}), sklic `, { continued: true })
      .font("B").text(ref, { continued: true }).font("R").text(".");
    y = doc.y + 8;
  }
  const notes = [inv.notes, s.note].filter(Boolean).join("\n");
  if (notes) { doc.font("R").fontSize(8.5).fillColor("#0a0a0a").text(notes, L, y, { width: CW }); y = doc.y + 8; }

  // ---- noga
  const fy = doc.page.height - 92;
  doc.font("R").fontSize(8).fillColor(gray).text(`Račun pripravil/a: ${inv.prepared_by || s.prepared_by}`, L, fy - 18, { width: CW, align: "right" });
  doc.moveTo(L, fy).lineTo(R, fy).lineWidth(1).strokeColor(A).stroke();
  doc.font("R").fontSize(7.5).fillColor(gray)
    .text(s.footer || "", L, fy + 8, { width: CW, align: "center" })
    .text(`${COMPANY.name} · ${COMPANY.address} · Matična št. ${COMPANY.reg} · ID za DDV ${COMPANY.vat} · ${COMPANY.court} · Osnovni kapital ${COMPANY.capital} · TRR ${COMPANY.iban}, ${COMPANY.bank}`, { width: CW, align: "center" });
  doc.end();
  return done;
}

/** Pošlje račun kupcu po e-mailu (PDF v prilogi). */
export async function emailInvoice(inv, to) {
  const { send, shell, esc } = await import("./mail");
  const pdf = await invoicePdf(inv);
  const credit = inv.kind === "dobropis";
  const html = shell(credit ? `Dobropis ${esc(inv.number)}` : `Račun ${esc(inv.number)}`,
    `<p style="font-size:15px;line-height:1.65;margin:0">Pozdravljeni${inv.customer_name ? ", " + esc(inv.customer_name.split(" ")[0]) : ""}!</p>
<p style="font-size:15px;line-height:1.65">V prilogi vam pošiljamo ${credit ? "dobropis" : "račun"} št. <b>${esc(inv.number)}</b> v znesku <b>${eurS(inv.total_cents)} €</b>.${inv.payment === "trr" && !credit ? ` Rok plačila: <b>${d8(inv.due_date)}</b>.` : ""}</p>
<p style="font-size:13px;color:#666">Račun pošiljamo samo v elektronski obliki — tako skupaj varujemo okolje. 🌱</p>`);
  const r = await send({ to: to || inv.customer_email, subject: `${credit ? "Dobropis" : "Račun"} ${inv.number} · ${COMPANY.short}`, html,
    attachments: [{ filename: `${credit ? "dobropis" : "racun"}-${inv.number}.pdf`, content: pdf.toString("base64") }] });
  if (!r.error && !r.skipped) await db()`UPDATE invoices SET sent_at = now(), sent_to = ${to || inv.customer_email} WHERE id = ${inv.id}`;
  return r;
}
