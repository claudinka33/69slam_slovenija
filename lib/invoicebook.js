import path from "node:path";
import { computeInvoice } from "./invoices";
import { COMPANY } from "./legal";

/* Knjiga izdanih računov (PDF, ležeče A4) — enaka oblika kot izpis iz Metakocke:
   sekcija Računi + sekcija Dobropisi, vmesni seštevki »Skupaj stran« in končni »Skupaj seznam«. */

const FONT = (n) => path.join(process.cwd(), "assets/fonts", n);
const TZ = "Europe/Ljubljana";
const d8 = (d) => (d ? new Date(d).toLocaleDateString("sl-SI", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\s/g, "") : "");
const n2 = (c) => (Number(c || 0) / 100).toLocaleString("sl-SI", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" }).replace("−", "-");
const PAID_NOW = ["kartica", "placano", "gotovina"];

function rowData(inv) {
  const g = computeInvoice(inv.items, inv.prices_gross).groups;
  const grp = (pred) => g.filter(pred).reduce((a, x) => ({ base: a.base + x.base, vat: a.vat + x.vat }), { base: 0, vat: 0 });
  const red = grp((x) => x.rate > 0 && x.rate < 22);
  const std = grp((x) => x.rate >= 22);
  const storno = inv.status === "storniran";
  const total = storno ? 0 : inv.total_cents;
  const paidDate = inv.paid_at || (PAID_NOW.includes(inv.payment) ? inv.issued_at : null);
  const paid = paidDate ? total : 0;
  const country = inv.customer_country && !/^(SI|slovenija|slovenia)$/i.test(inv.customer_country) ? inv.customer_country : "Slovenija";
  return {
    number: inv.number, date: d8(inv.issued_at), due: d8(inv.due_date || inv.issued_at), ref: inv.ref_number || "",
    customer: [inv.customer_name, inv.customer_address, inv.customer_zip_city, country].filter(Boolean).join("\n") + (storno ? "\n(STORNIRAN)" : ""),
    pre: 0,
    net: storno ? 0 : inv.net_cents,
    red: storno ? { base: 0, vat: 0 } : red,
    std: storno ? { base: 0, vat: 0 } : std,
    total, paid, saldo: total - paid, paidOn: paidDate && !storno ? d8(paidDate) : "",
  };
}

export async function invoiceBookPdf(invoices, { from, to, preparedBy }) {
  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36, bufferPages: true,
    info: { Title: `Knjiga izdanih računov ${d8(from)} – ${d8(to)}`, Author: COMPANY.short } });
  doc.registerFont("R", FONT("Poppins-Regular.ttf"));
  doc.registerFont("B", FONT("Poppins-Bold.ttf"));
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  const L = 36, R = doc.page.width - 36, BOTTOM = doc.page.height - 60;
  const FS = 6.8;
  const ink = "#111", gray = "#555", bar = "#8a8a8a";

  // stolpci (x, širina, poravnava)
  const W = [["num", 64, "left"], ["date", 50, "left"], ["cust", 128, "left"], ["due", 52, "left"], ["pre", 46, "right"],
    ["net", 56, "right"], ["red", 76, "right"], ["std", 82, "right"], ["total", 56, "right"], ["paid", 52, "right"],
    ["saldo", 50, "right"], ["on", 0, "right"]];
  const C = {};
  let cx = L;
  for (const [k, w, a] of W) { const ww = w || R - cx; C[k] = [cx, ww - (k === "on" ? 0 : 4), a]; cx += ww; }
  // dobropisi: namesto »Rok plačila / Predplačilo« stolpec »Povezan račun«
  const CD = { ...C, ref: [C.due[0], C.net[0] - C.due[0] - 6, "left"] };

  const txt = (s, [x, w, a], y, font = "R", size = FS, color = ink) =>
    doc.font(font).fontSize(size).fillColor(color).text(String(s), x, y, { width: w, align: a, lineGap: 0.5 });

  let y = 0;
  const header = (title, credit) => {
    doc.roundedRect(L, y, R - L, 18, 4).fill(bar);
    doc.font("R").fontSize(10).fillColor("#fff").text(title, L + 6, y + 3.5);
    y += 24;
    const H = credit
      ? [["Št. dobropisa", CD.num], ["Datum dob.", CD.date], ["Kupec", CD.cust], ["Povezan račun", CD.ref]]
      : [["Št. računa", C.num], ["Datum rač.", C.date], ["Kupec", C.cust], ["Rok plačila", C.due], ["Predplačilo", C.pre]];
    for (const [t, c] of [...H, ["Skupaj", C.net], ["DDV znižana (osnova)", C.red], ["DDV standardna\n(osnova)", C.std],
      ["Skupni znesek", C.total], ["Plačano", C.paid], ["Saldo", C.saldo], ["Dok. plačilo", C.on]]) txt(t, c, y, "B", 6.8);
    y += 24;
    doc.moveTo(L, y - 3).lineTo(R, y - 3).lineWidth(0.6).strokeColor(ink).stroke();
    y += 2;
  };
  const sumLine = (label, s, credit, final) => {
    const x0 = L + 200;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor(ink).stroke();
    y += 5;
    txt(label, [L + 200, (credit ? C.net[0] : C.pre[0]) - L - 206, "right"], y, "B");
    if (!credit) txt(n2(s.pre), C.pre, y, "R");
    txt(n2(s.net), C.net, y); txt(`${n2(s.redV)} (${n2(s.redB)})`, C.red, y); txt(`${n2(s.stdV)} (${n2(s.stdB)})`, C.std, y);
    txt(n2(s.total), C.total, y); txt(credit ? "" : n2(s.paid), C.paid, y); txt(n2(s.saldo), C.saldo, y);
    y += 13;
    doc.moveTo(x0, y).lineTo(C.on[0], y).lineWidth(0.6).strokeColor(ink).stroke();
    if (final) y += 2;
    y += 6;
  };
  const zero = () => ({ pre: 0, net: 0, redV: 0, redB: 0, stdV: 0, stdB: 0, total: 0, paid: 0, saldo: 0 });
  const add = (s, r) => { s.pre += r.pre; s.net += r.net; s.redV += r.red.vat; s.redB += r.red.base; s.stdV += r.std.vat; s.stdB += r.std.base; s.total += r.total; s.paid += r.paid; s.saldo += r.saldo; };

  const section = (title, list, credit) => {
    if (!list.length) return;
    if (y > BOTTOM - 80) { doc.addPage(); y = 36; }
    header(title, credit);
    let page = zero(); const all = zero();
    for (const inv of list) {
      const r = rowData(inv);
      doc.font("R").fontSize(FS);
      const h = Math.max(12, doc.heightOfString(r.customer, { width: C.cust[1], lineGap: 0.5 })) + 6;
      if (y + h > BOTTOM - 26) {
        sumLine("Skupaj stran:", page, credit);
        doc.addPage(); y = 36; header(title, credit); page = zero();
      }
      const cc = credit ? CD : C;
      doc.moveTo(L, y - 3).lineTo(R, y - 3).lineWidth(0.2).strokeColor("#d0d0d0").stroke();
      txt(r.number, cc.num, y); txt(r.date, cc.date, y); txt(r.customer, cc.cust, y);
      if (credit) txt(r.ref, CD.ref, y); else { txt(r.due, C.due, y); txt(n2(r.pre), C.pre, y); }
      txt(n2(r.net), C.net, y); txt(`${n2(r.red.vat)} (${n2(r.red.base)})`, C.red, y); txt(`${n2(r.std.vat)} (${n2(r.std.base)})`, C.std, y);
      txt(n2(r.total), C.total, y); txt(credit ? "" : n2(r.paid), C.paid, y); txt(n2(r.saldo), C.saldo, y); txt(r.paidOn, C.on, y);
      add(page, r); add(all, r);
      y += h;
    }
    sumLine("Skupaj stran:", page, credit);
    sumLine("Skupaj seznam:", all, credit, true);
    y += 24;
  };

  // naslov
  y = 36;
  doc.moveTo(L, y).lineTo(R, y).lineWidth(2).strokeColor(bar).stroke();
  y += 6;
  doc.font("B").fontSize(15).fillColor(ink).text(`Računi za obdobje od ${d8(from)} do ${d8(to)}`, L, y);
  doc.font("R").fontSize(8).fillColor(gray).text(`${COMPANY.name} · ${COMPANY.street}, ${COMPANY.city} · ID za DDV: ${COMPANY.vat}`, L, y + 20);
  y += 44;

  section("Računi", invoices.filter((i) => i.kind === "racun"), false);
  section("Dobropisi", invoices.filter((i) => i.kind === "dobropis"), true);
  if (!invoices.length) { doc.font("R").fontSize(10).fillColor(gray).text("V tem obdobju ni izdanih računov ali dobropisov.", L, y); }

  // noga na vsaki strani: čas izpisa + stran X od Y; na zadnji »Dokument pripravil/a«
  const stamp = new Date().toLocaleString("sl-SI", { timeZone: TZ });
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.page.margins.bottom = 0; // da noga ne doda nove strani
    const fy = doc.page.height - 40;
    if (i === range.count - 1 && preparedBy)
      doc.font("R").fontSize(7.5).fillColor(ink).text(`Dokument pripravil/a: ${preparedBy}`, L, fy - 14, { width: R - L, align: "right", lineBreak: false });
    doc.moveTo(L, fy - 3).lineTo(R, fy - 3).lineWidth(2).strokeColor(bar).stroke();
    doc.font("R").fontSize(7.5).fillColor(ink).text(stamp, L, fy, { lineBreak: false });
    doc.text(`Stran ${i + 1} od ${range.count}`, L, fy, { width: R - L, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}
