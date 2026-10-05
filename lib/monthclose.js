import * as XLSX from "xlsx";
import { zipSync } from "fflate";
import { db } from "./db";
import { invoicePdf, getInvSettings, computeInvoice, KIND_FILE, PAY_LABEL } from "./invoices";

/* »Zaključi mesec« — paket za računovodkinjo: PDF vseh računov in dobropisov + Excel seznam (+ prevzemi). */

const ymOk = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ""));
export function prevMonth() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const d8 = (x) => (x ? new Date(x).toLocaleDateString("sl-SI", { timeZone: "Europe/Ljubljana" }) : "");
const eur = (c) => Math.round(Number(c || 0)) / 100;

async function docsOf(ym) {
  const sql = db();
  const invoices = await sql`SELECT i.*, o.number AS order_number FROM invoices i LEFT JOIN orders o ON o.id = i.order_id
    WHERE i.kind IN ('racun', 'dobropis') AND i.series IN ('R', 'DBP')
      AND to_char(i.issued_at AT TIME ZONE 'Europe/Ljubljana', 'YYYY-MM') = ${ym}
    ORDER BY i.issued_at, i.id`;
  const receipts = await sql`SELECT r.*, (SELECT COALESCE(SUM(qty),0)::int FROM receipt_items WHERE receipt_id = r.id) AS pcs
    FROM receipts r WHERE to_char(r.doc_date, 'YYYY-MM') = ${ym} ORDER BY r.doc_date, r.id`;
  return { invoices, receipts };
}

export async function monthSummary(ym) {
  if (!ymOk(ym)) throw new Error("Napačen mesec.");
  const { invoices, receipts } = await docsOf(ym);
  const live = invoices.filter((i) => i.status !== "storniran");
  const [log] = await db()`SELECT value FROM settings WHERE key = 'month_close'`;
  return {
    month: ym,
    racuni: invoices.filter((i) => i.kind === "racun").length,
    dobropisi: invoices.filter((i) => i.kind === "dobropis").length,
    total: live.reduce((a, i) => a + i.total_cents, 0),
    net: live.reduce((a, i) => a + i.net_cents, 0),
    vat: live.reduce((a, i) => a + i.vat_cents, 0),
    prevzemi: receipts.length,
    log: (log?.value || {})[ym] || null,
  };
}

export async function monthPackage(ym) {
  if (!ymOk(ym)) throw new Error("Napačen mesec.");
  const s = await getInvSettings();
  const { invoices, receipts } = await docsOf(ym);
  const files = {};
  for (const inv of invoices) {
    const dir = inv.kind === "dobropis" ? "dobropisi" : "racuni";
    files[`${dir}/${KIND_FILE[inv.kind] || "racun"}-${inv.number}.pdf`] = new Uint8Array(await invoicePdf(inv, s));
  }
  const rows = invoices.map((i) => {
    const g = computeInvoice(i.items, i.prices_gross).groups;
    const base = (r) => eur(g.find((x) => x.rate === r)?.base || 0), vat = (r) => eur(g.find((x) => x.rate === r)?.vat || 0);
    return {
      "Vrsta": i.kind === "dobropis" ? "Dobropis" : "Račun", "Številka": i.number, "Datum izdaje": d8(i.issued_at),
      "Datum storitve": d8(i.service_date), "Kupec": i.customer_name, "Naslov": [i.customer_address, i.customer_zip_city].filter(Boolean).join(", "),
      "Država": i.customer_country || "", "ID za DDV kupca": i.customer_vat || "",
      "Osnova 22 %": base(22), "DDV 22 %": vat(22), "Osnova 9,5 %": base(9.5), "DDV 9,5 %": vat(9.5), "Osnova 0 %": base(0),
      "Skupaj brez DDV": eur(i.net_cents), "DDV skupaj": eur(i.vat_cents), "Skupaj z DDV": eur(i.total_cents),
      "Način plačila": PAY_LABEL[i.payment] || i.payment || "", "Plačano": i.paid_at ? d8(i.paid_at) : (["kartica", "placano", "gotovina"].includes(i.payment) ? "da" : ""),
      "K računu": i.ref_number || "", "Spletno naročilo": i.order_number ? `#${i.order_number}` : "", "Stanje": i.status,
    };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Ni dokumentov": "" }]), "Računi in dobropisi");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receipts.length ? receipts.map((r) => ({
    "Številka prevzema": r.number, "Datum": d8(r.doc_date), "Dobavitelj": r.supplier, "Dokument dobavitelja": r.doc_ref || "",
    "Kosov": r.pcs, "Nabavna vrednost brez DDV": eur(r.total_cents), "Opomba": r.note || "" })) : [{ "Ni prevzemov": "" }]), "Prevzemi");
  files[`seznam-${ym}.xlsx`] = new Uint8Array(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  const zip = Buffer.from(zipSync(files, { level: 6 }));
  return { zip, filename: `69slam-racuni-${ym}.zip`, count: invoices.length, receipts: receipts.length };
}

export async function logMonth(ym, entry) {
  const sql = db();
  const [r] = await sql`SELECT value FROM settings WHERE key = 'month_close'`;
  const v = { ...(r?.value || {}), [ym]: entry };
  await sql`INSERT INTO settings (key, value) VALUES ('month_close', ${JSON.stringify(v)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
}
