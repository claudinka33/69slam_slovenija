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
  footer: "Hvala za zaupanje! Dokument je izdan v elektronski obliki in je veljaven brez podpisa in žiga.",
  show_logo: true,
  accountant_email: "",     // »Zaključi mesec« pošlje paket računovodkinji
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

/* serije: računi 2026-1000 · dobropisi DBP-2026-1000 · predračuni PR-2026-1000 · dobavnice DOB-2026-1000 */
export const SERIES = { racun: ["R", ""], dobropis: ["DBP", "DBP-"], predracun: ["PR", "PR-"], dobavnica: ["DOB", "DOB-"] };
export const KIND_TITLE = { racun: "RAČUN", dobropis: "DOBROPIS", predracun: "PREDRAČUN", dobavnica: "DOBAVNICA" };
export const KIND_NAME = { racun: "Račun", dobropis: "Dobropis", predracun: "Predračun", dobavnica: "Dobavnica" };
export const KIND_FILE = { racun: "racun", dobropis: "dobropis", predracun: "predracun", dobavnica: "dobavnica" };

/** Naslednja številka v seriji in letu. */
async function nextNumber(sql, series, year, start) {
  const [r] = await sql`SELECT MAX(seq)::int AS m FROM invoices WHERE series = ${series} AND year = ${year}`;
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
  const kind = SERIES[data.kind] ? data.kind : "racun";
  const [series, prefix] = SERIES[kind];
  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = await nextNumber(sql, series, year, s.start);
    try {
      const [inv] = await sql`INSERT INTO invoices (number, series, year, seq, kind, ref_number, order_id, source_id, tracking, pay_ref, issued_at, service_date, due_date, place,
          customer_name, customer_address, customer_zip_city, customer_country, customer_vat, customer_email,
          items, prices_gross, payment, notes, net_cents, vat_cents, total_cents, prepared_by)
        VALUES (${`${prefix}${year}-${seq}`}, ${series}, ${year}, ${seq}, ${kind}, ${data.ref || null}, ${data.order_id || null}, ${data.source_id || null},
          ${data.tracking || null}, ${data.pay_ref || null}, ${now.toISOString()},
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
  throw new Error("Številke dokumenta ni bilo mogoče dodeliti.");
}

/** Podatki za dokument iz spletnega naročila. */
async function orderDocData(sql, orderId) {
  const [o] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!o) return null;
  const items = await sql`SELECT sku, name, size, qty, price_cents, bundle_key FROM order_items WHERE order_id = ${orderId} ORDER BY id`;
  const lines = items.map((it) => ({ code: it.sku, desc: `${it.name} (vel. ${it.size})${it.bundle_key ? " · Paket 3" : ""}`, qty: it.qty, unit: "kos", price: it.price_cents / 100, disc: 0, vat: 22 }));
  if (o.shipping_cents) lines.push({ code: "", desc: "Poštnina (Pošta Slovenije)", qty: 1, unit: "kos", price: o.shipping_cents / 100, disc: 0, vat: 22 });
  if (o.cod_fee_cents) lines.push({ code: "", desc: "Strošek plačila po povzetju", qty: 1, unit: "kos", price: o.cod_fee_cents / 100, disc: 0, vat: 22 });
  return {
    o, order_id: orderId, gross: true, items: lines, pay_ref: `SI00${o.number}`, tracking: o.tracking || null,
    payment: o.payment === "card" ? "kartica" : o.payment === "cod" ? "povzetje" : "trr",
    customer: { name: o.name, address: o.address, zip_city: `${o.zip} ${o.city}`, country: "Slovenija", email: o.email },
    base: `Spletno naročilo #${o.number}${o.coupon_code ? ` · koda za popust ${o.coupon_code}` : ""}.`,
  };
}
const docOf = (sql, orderId, kind) => sql`SELECT * FROM invoices WHERE order_id = ${orderId} AND kind = ${kind} AND status = 'izdan' ORDER BY id LIMIT 1`.then((r) => r[0] || null);

/** Ob novem naročilu: dobavnica (vedno) + predračun (plačilo po predračunu). Vrne { dobavnica, predracun }. */
export async function docsForNewOrder(orderId) {
  const sql = db();
  const d = await orderDocData(sql, orderId);
  if (!d) return {};
  const out = {};
  out.dobavnica = (await docOf(sql, orderId, "dobavnica")) || (await issueInvoice({ ...d, kind: "dobavnica", due_days: 0, notes: d.base }));
  if (d.o.payment === "proforma")
    out.predracun = (await docOf(sql, orderId, "predracun")) || (await issueInvoice({ ...d, kind: "predracun", payment: "trr", due_days: 5,
      notes: `${d.base} Paket pošljemo takoj, ko prejmemo plačilo. Predračun ni račun — račun prejmete ob odpremi.` }));
  return out;
}

/** Račun iz spletnega naročila (enkrat na naročilo) — iz dobavnice, če obstaja. */
export async function invoiceFromOrder(orderId) {
  const sql = db();
  const had = await docOf(sql, orderId, "racun");
  if (had) return had;
  const d = await orderDocData(sql, orderId);
  if (!d) return null;
  const dob = await docOf(sql, orderId, "dobavnica");
  const pre = await docOf(sql, orderId, "predracun");
  const paidNote = d.o.payment === "card" ? "Plačano s plačilno kartico ob naročilu." : d.o.payment === "cod" ? "Znesek plačate ob prevzemu paketa (po povzetju)."
    : d.o.paid_at ? `Plačano po predračunu${pre ? " " + pre.number : ""}.` : "";
  const inv = await issueInvoice({ ...d, kind: "racun", due_days: 0, source_id: dob?.id || null, tracking: d.o.tracking || dob?.tracking || null,
    payment: d.o.payment === "proforma" ? (d.o.paid_at ? "placano" : "trr") : d.payment,
    notes: [d.base, dob ? `Dobavnica ${dob.number}.` : "", paidNote].filter(Boolean).join(" ") });
  if (dob) await sql`UPDATE invoices SET converted_to = ${inv.number}, tracking = COALESCE(${d.o.tracking}, tracking) WHERE id = ${dob.id}`;
  if (pre) await sql`UPDATE invoices SET converted_to = ${inv.number} WHERE id = ${pre.id}`;
  return inv;
}

/** Iz predračuna ali dobavnice (ročne) naredi račun. */
export async function convertToInvoice(docId) {
  const sql = db();
  const [src] = await sql`SELECT * FROM invoices WHERE id = ${docId}`;
  if (!src || !["predracun", "dobavnica"].includes(src.kind)) throw new Error("Iz tega dokumenta ni mogoče narediti računa.");
  if (src.converted_to) throw new Error(`Račun je že narejen (${src.converted_to}).`);
  if (src.order_id) return invoiceFromOrder(src.order_id);
  const inv = await issueInvoice({ kind: "racun", source_id: src.id, gross: src.prices_gross, payment: src.payment, tracking: src.tracking,
    customer: { name: src.customer_name, address: src.customer_address, zip_city: src.customer_zip_city, country: src.customer_country, vat: src.customer_vat, email: src.customer_email },
    items: src.items, service_date: src.service_date,
    notes: [`Na podlagi dokumenta ${KIND_NAME[src.kind].toLowerCase()} ${src.number}.`, src.notes].filter(Boolean).join(" ") });
  await sql`UPDATE invoices SET converted_to = ${inv.number} WHERE id = ${src.id}`;
  return inv;
}

/* ---------- DOBROPISI (delni ali celotni, k računu) ---------- */
/** Koliko je pri vsaki postavki računa še mogoče dobropisati. */
export async function creditable(inv) {
  const prior = await db()`SELECT items FROM invoices WHERE kind = 'dobropis' AND source_id = ${inv.id} AND status <> 'storniran'`;
  const done = {};
  for (const d of prior) for (const it of d.items || []) if (it.src != null) done[it.src] = (done[it.src] || 0) + Math.abs(Number(it.qty) || 0);
  return (inv.items || []).map((it, i) => Math.max(0, Math.round(((Number(it.qty) || 0) - (done[i] || 0)) * 1000) / 1000));
}

/** Zaloga +q za vrnjene kose (SKU iz šifre postavke). Vrne { ok: [sku], unknown: [code] }. */
async function restockLines(lines, note) {
  const sql = db();
  const out = { ok: [], unknown: [] };
  for (const l of lines) {
    const key = String(l.code || "").replace(/\s+/g, "").toUpperCase();
    const [v] = key ? await sql`SELECT sku FROM variants WHERE upper(replace(sku, ' ', '')) = ${key} LIMIT 1` : [];
    if (!v) { out.unknown.push(l.code || l.desc); continue; }
    await sql`UPDATE variants SET stock = stock + ${l.qty} WHERE sku = ${v.sku}`;
    await sql`INSERT INTO stock_moves (sku, delta, reason, note) VALUES (${v.sku}, ${l.qty}, 'vracilo', ${note})`;
    out.ok.push(`${v.sku} +${l.qty}`);
  }
  return out;
}

/**
 * Dobropis k računu. opts: { lines: [{ i, qty, restock }], reason, refund, send }
 * i = indeks postavke na računu, qty = koliko kosov (pozitivno).
 */
export async function creditNote(invId, opts = {}) {
  const sql = db();
  const [inv] = await sql`SELECT * FROM invoices WHERE id = ${invId}`;
  if (!inv || inv.kind !== "racun") throw new Error("Dobropis lahko narediš samo iz računa.");
  if (inv.series === "MK") throw new Error("Arhivski računi iz Metakocke so zaklenjeni.");
  if (inv.status === "storniran") throw new Error("Račun je storniran.");
  const rest = await creditable(inv);
  const pick = [];
  for (const l of opts.lines || []) {
    const i = Number(l.i), q = Math.abs(Number(String(l.qty ?? 0).replace(",", ".")) || 0);
    if (!q || !inv.items[i]) continue;
    if (q > rest[i] + 1e-9) throw new Error(`Pri »${inv.items[i].desc}« lahko vrneš največ ${rest[i]}.`);
    pick.push({ i, q, restock: !!l.restock });
  }
  if (!pick.length) throw new Error("Izberi vsaj en kos za dobropis.");
  const reason = String(opts.reason || "").trim().slice(0, 300);
  const items = pick.map(({ i, q }) => ({ ...inv.items[i], qty: -q, src: i }));
  const cr = await issueInvoice({ kind: "dobropis", ref: inv.number, source_id: inv.id, order_id: inv.order_id, gross: inv.prices_gross,
    payment: opts.refund || inv.payment, due_days: 0,
    customer: { name: inv.customer_name, address: inv.customer_address, zip_city: inv.customer_zip_city, country: inv.customer_country, vat: inv.customer_vat, email: inv.customer_email },
    items, notes: [`Dobropis k računu št. ${inv.number}.`, reason ? `Razlog: ${reason}.` : ""].filter(Boolean).join(" ") });
  const back = pick.filter((p) => p.restock).map((p) => ({ code: inv.items[p.i].code, desc: inv.items[p.i].desc, qty: Math.round(p.q) }));
  const stock = back.length ? await restockLines(back, `Vračilo — dobropis ${cr.number}`) : { ok: [], unknown: [] };
  let mail = null;
  if (opts.send && inv.customer_email) mail = await emailInvoice(cr);
  return { invoice: cr, stock, mail };
}

/* ---------- PDF ---------- */
const FONT = (n) => path.join(process.cwd(), "assets/fonts", n);

export async function invoicePdf(inv, s0) {
  const s = s0 || (await getInvSettings());
  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: `${KIND_NAME[inv.kind] || "Račun"} ${inv.number}`, Author: COMPANY.short } });
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
  const kind = inv.kind || "racun";
  const isPre = kind === "predracun", isDob = kind === "dobavnica";
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
  doc.font("B").fontSize(22).fillColor("#0a0a0a").text(KIND_TITLE[kind] || "RAČUN", L, 128);
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
  const kv = isDob
    ? [["Datum izdaje", d8(inv.issued_at)], ["Datum odpreme", d8(inv.service_date)], ["Način plačila", PAY_LABEL[inv.payment] || inv.payment],
       ["Številka pošiljke", inv.tracking || "—"], ["Kraj izdaje", inv.place || s.place]]
    : isPre
    ? [["Datum izdaje", d8(inv.issued_at)], ["Velja do / rok plačila", d8(inv.due_date)], ["Način plačila", PAY_LABEL[inv.payment] || inv.payment], ["Kraj izdaje", inv.place || s.place]]
    : credit
    ? [["Datum izdaje", d8(inv.issued_at)], ["K računu", inv.ref_number || "—"],
       ["Način vračila", { trr: "Nakazilo na TRR kupca", kartica: "Na plačilno kartico", gotovina: "Gotovina" }[inv.payment] || PAY_LABEL[inv.payment] || inv.payment], ["Kraj izdaje", inv.place || s.place]]
    : [["Datum izdaje", d8(inv.issued_at)], ["Datum storitve / dobave", d8(inv.service_date)],
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
    { k: "Vrednost", w: CW - 16 - 432, a: "right" },
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
  row(credit ? "Za vračilo" : isDob ? "Vrednost" : "Za plačilo", eurS(calc.total), true);
  y = Math.max(y, ry) + 18;

  // ---- plačilo + opombe
  const refRaw = inv.pay_ref || `SI00${String(inv.number).replace(/\D/g, "")}`;
  const ref = refRaw.replace(/^SI00/, "SI00 ");
  doc.font("R").fontSize(8.5).fillColor("#0a0a0a");
  if (inv.payment === "trr" && !credit && !isDob && calc.total > 0 && inv.series !== "MK" && !inv.paid_at) {
    // UPN QR — skeniraš z mobilno banko in vse se izpolni samo
    if (y + 120 > doc.page.height - 110) { doc.addPage(); y = 50; }
    try {
      const { upnPng } = await import("./upn");
      const { png } = await upnPng({ amountCents: calc.total, number: inv.number, ref: refRaw, dueDate: inv.due_date, name: inv.customer_name,
        street: inv.customer_address || "", city: inv.customer_zip_city || "", purpose: `${KIND_NAME[kind]} ${inv.number}` });
      doc.roundedRect(L, y, CW, 112, 10).fill(soft);
      doc.image(png, L + 10, y + 8, { width: 96 });
      doc.font("B").fontSize(9).fillColor("#0a0a0a").text("Plačilo z UPN QR kodo", L + 120, y + 14, { width: CW - 130 });
      doc.font("R").fontSize(8.5).fillColor("#0a0a0a").text("Skenirajte kodo z mobilno banko — vsi podatki se izpolnijo sami.", L + 120, doc.y + 2, { width: CW - 130 });
      doc.moveDown(0.4);
      const kv2 = [["Znesek", `${eurS(calc.total)} €`], ["Prejemnik", `${COMPANY.short}, ${COMPANY.address}`], ["IBAN", `${COMPANY.iban} (${COMPANY.bank}, BIC ${COMPANY.bic})`],
        ["Sklic", ref], ["Rok plačila", d8(inv.due_date)]];
      let qy = doc.y;
      for (const [k, v] of kv2) { doc.font("R").fontSize(8).fillColor(gray).text(k, L + 120, qy, { width: 70 }); doc.font("M").fontSize(8).fillColor("#0a0a0a").text(v, L + 190, qy, { width: CW - 200 }); qy += 11; }
      y += 122;
    } catch (e) {
      doc.text(`Prosimo, da znesek poravnate do ${d8(inv.due_date)} na TRR ${COMPANY.iban} (${COMPANY.bank}), sklic ${ref}.`, L, y, { width: CW });
      y = doc.y + 8;
    }
  }
  const notes = [inv.notes, isDob ? "" : s.note].filter(Boolean).join("\n");
  if (notes) { doc.font("R").fontSize(8.5).fillColor("#0a0a0a").text(notes, L, y, { width: CW }); y = doc.y + 8; }

  // ---- noga
  const fy = doc.page.height - 92;
  if (isDob) doc.font("R").fontSize(8).fillColor(gray).text("Blago prevzel/a: ______________________", L, fy - 18, { width: CW / 2 });
  doc.font("R").fontSize(8).fillColor(gray).text(`${KIND_NAME[kind] || "Račun"} pripravil/a: ${inv.prepared_by || s.prepared_by}`, L, fy - 18, { width: CW, align: "right" });
  doc.moveTo(L, fy).lineTo(R, fy).lineWidth(1).strokeColor(A).stroke();
  doc.font("R").fontSize(7.5).fillColor(gray)
    .text(s.footer || "", L, fy + 8, { width: CW, align: "center" })
    .text(`${COMPANY.name} · ${COMPANY.address} · Matična št. ${COMPANY.reg} · ID za DDV ${COMPANY.vat} · ${COMPANY.court} · Osnovni kapital ${COMPANY.capital} · TRR ${COMPANY.iban}, ${COMPANY.bank}`, { width: CW, align: "center" });
  doc.end();
  return done;
}

/** PDF kot priloga za e-mail. */
export async function docAttachment(inv) {
  return { filename: `${KIND_FILE[inv.kind] || "racun"}-${inv.number}.pdf`, content: (await invoicePdf(inv)).toString("base64") };
}

/** Pošlje dokument kupcu po e-mailu (PDF v prilogi). */
export async function emailInvoice(inv, to) {
  const { send, shell, esc } = await import("./mail");
  const name = KIND_NAME[inv.kind] || "Račun";
  const lower = name.toLowerCase();
  const html = shell(`${name} ${esc(inv.number)}`,
    `<p style="font-size:15px;line-height:1.65;margin:0">Pozdravljeni${inv.customer_name ? ", " + esc(inv.customer_name.split(" ")[0]) : ""}!</p>
<p style="font-size:15px;line-height:1.65">V prilogi vam pošiljamo ${lower} št. <b>${esc(inv.number)}</b>${inv.kind === "dobavnica" ? "" : ` v znesku <b>${eurS(Math.abs(inv.total_cents))} €</b>`}.${inv.kind === "dobropis" ? (inv.ref_number ? ` Dobropis se nanaša na račun št. ${esc(inv.ref_number)}.` : "") + (inv.payment === "kartica" ? " Znesek vam vrnemo na plačilno kartico, s katero ste plačali — na računu bo viden v nekaj delovnih dneh." : inv.payment === "gotovina" ? "" : " Znesek vam nakažemo na vaš bančni račun v nekaj delovnih dneh.") : ""}${inv.payment === "trr" && ["racun", "predracun"].includes(inv.kind) ? ` Rok plačila: <b>${d8(inv.due_date)}</b> — na dokumentu je UPN QR koda za hitro plačilo z mobilno banko.` : ""}</p>
<p style="font-size:13px;color:#666">Dokumente pošiljamo samo v elektronski obliki — tako skupaj varujemo okolje. 🌱</p>`);
  const r = await send({ to: to || inv.customer_email, subject: `${name} ${inv.number} · ${COMPANY.short}`, html, attachments: [await docAttachment(inv)] });
  if (!r.error && !r.skipped) await db()`UPDATE invoices SET sent_at = now(), sent_to = ${to || inv.customer_email} WHERE id = ${inv.id}`;
  return r;
}
