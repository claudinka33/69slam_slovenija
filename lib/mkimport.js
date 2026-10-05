import * as XLSX from "xlsx";
import { db, ensureSchema } from "./db";

/* =====================================================================
 * Uvoz zgodovine iz Metakocke (arhiv):
 *  - seznam računov (xlsx »Seznam računov«) → glava računa, kupec, plačilo, FURS, veza na Shopify
 *  - izpis prodajnih računov – podrobno (xlsx) → postavke
 *  - izpis nabavnih računov – podrobno (xlsx) → Prevzemi (BREZ spremembe zaloge)
 * Arhivski računi: serija »MK«, originalne številke, status »arhiv« (samo za branje).
 * ===================================================================== */

const s = (v) => (v == null ? "" : String(v).trim());
const num = (v) => { if (v == null || v === "") return 0; if (typeof v === "number") return v; const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const cents = (v) => Math.round(num(v) * 100);
/** "09.10.2023" ali Excel datum → "2023-10-09" */
function isoDate(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}` : null; }
  const m = String(v).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** Vse vrstice vseh listov, ki imajo glavo z danim prvim stolpcem. */
function tables(buf, firstCol) {
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const out = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    // nekateri izvozi imajo napačno območje (!ref) — izračunaj ga iz celic
    const keys = Object.keys(ws).filter((k) => k[0] !== "!");
    if (keys.length) {
      const R = { s: { r: 1e9, c: 1e9 }, e: { r: 0, c: 0 } };
      for (const k of keys) { const a = XLSX.utils.decode_cell(k); R.s.r = Math.min(R.s.r, a.r); R.s.c = Math.min(R.s.c, a.c); R.e.r = Math.max(R.e.r, a.r); R.e.c = Math.max(R.e.c, a.c); }
      ws["!ref"] = XLSX.utils.encode_range(R);
    }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    const hi = rows.findIndex((r) => r && s(r[0]) === firstCol);
    if (hi < 0) continue;
    const head = rows[hi].map(s);
    for (const r of rows.slice(hi + 1)) {
      if (!r || !s(r[0])) continue;
      const o = { _sheet: name };
      head.forEach((h, i) => { if (h) o[h] = r[i]; });
      out.push(o);
    }
  }
  return out;
}

/** Postavke iz »podrobno« izpisa, po številki računa. */
function linesBy(rows) {
  const by = {};
  for (const r of rows) {
    const code = s(r["Šifra artikla"]), desc = s(r["Naziv artikla"]);
    const qty = num(r["Količina"]);
    const price = num(r["Prod.cena brez DDV/EM"] ?? r["Nab.cena brez DDV/EM (EUR)"] ?? r["Nab.cena brez DDV/EM"]);
    if (!code && !desc && !qty) continue;
    if (!qty && !price) continue;
    const tax = num(r["Davek"]);
    const vat = price ? Math.round((tax / price) * 100) : 22;
    (by[s(r["Številka računa"])] = by[s(r["Številka računa"])] || []).push({
      code, desc: desc || code, qty, unit: s(r["Em"]) || "kos", price: Math.round(price * 10000) / 10000,
      disc: num(r["Popust"]), vat: [0, 5, 9.5, 22].includes(vat) ? vat : vat > 15 ? 22 : vat > 7 ? 9.5 : vat > 2 ? 5 : 0,
      total: num(r["Skupaj prodaja"] ?? r["Skupaj nabava (EUR)"]), date: isoDate(r["Datum računa"]), partner: s(r["Partner"]),
    });
  }
  return by;
}

function payOf(v, paid) {
  const t = s(v).toLowerCase();
  if (t.includes("cash on delivery") || t.includes("povzet")) return "povzetje";
  if (t.includes("kartic") || t.includes("stripe") || t.includes("paypal")) return "kartica";
  if (t.includes("transakcij")) return "trr";
  if (t.includes("gotov")) return "gotovina";
  return paid ? "placano" : "trr";
}

/** Iz šifre Metakocke (»MBYNSK-PO XS«) → { code, size } */
function splitCode(raw, codes) {
  const t = s(raw);
  const m = t.match(/^(.*?)[\s-]+((?:\d?X{0,3}[SML])|XS|XXL|XXXL|\d{1,3}(?:\/\d{1,3})?|UNI|ONE ?SIZE)$/i);
  const base = (m ? m[1] : t).trim();
  const size = m ? m[2].toUpperCase() : "";
  const [a, ...rest] = base.split("-");
  const s0 = a.replace(/\s+/g, "").toUpperCase();
  const s1 = (rest.join("-").trim().split(/[\s-]+/)[0] || "").toUpperCase();
  for (const c of [s0 + s1, s0]) if (codes.has(c)) return { code: c, size };
  return { code: s0, size };
}

/**
 * Pripravi uvoz. files: { seznam?, podrobno?, nabava? } (Buffer). Vrne { invoices, receipts, summary }.
 */
export async function prepareMk(files, opts = {}) {
  const sql = opts.sql || db();
  if (!opts.sql) await ensureSchema();
  const head = files.seznam ? tables(files.seznam, "Številka rač.").filter((r) => /\d/.test(s(r["Številka rač."])) && r["Datum računa"]) : [];
  const lines = files.podrobno ? linesBy(tables(files.podrobno, "Številka računa")) : {};
  const orders = await sql`SELECT id, number, status FROM orders`;
  const byNum = new Map(orders.map((o) => [String(o.number), o]));

  const invoices = [];
  const sum = { racuni: 0, dobropisi: 0, shopify_v_bazi: 0, shopify_ni_v_bazi: 0, ostali: 0, brez_postavk: 0, razlika: 0, bruto: 0 };
  for (const r of head) {
    const number = s(r["Številka rač."]);
    const kind = s(r["Tip"]) === "Dobropis" || num(r["Bruto v EUR"]) < 0 ? "dobropis" : "racun";
    const date = isoDate(r["Datum računa"]);
    const shopRaw = s(r["Naročilo kupca"]);
    const shopNo = /^\d{4,5}$/.test(shopRaw) ? shopRaw : null;
    const ord = shopNo ? byNum.get(shopNo) : null;
    let items = (lines[number] || []).map(({ total, date: _d, partner, ...x }) => x);
    if (kind === "dobropis") items = items.map((i) => ({ ...i, qty: -Math.abs(i.qty) }));
    const total = cents(r["Bruto v EUR"]), net = cents(r["Neto v EUR"]);
    if (!items.length) {
      sum.brez_postavk++;
      items = [{ code: "", desc: "Skupaj po računu iz Metakocke", qty: kind === "dobropis" ? -1 : 1, unit: "kos", price: Math.abs(net) / 100, disc: 0, vat: total !== net ? 22 : 0 }];
    }
    // preverba: vsota postavk proti znesku računa
    const gsum = (L) => L.reduce((a, i) => a + i.qty * i.price * (1 - i.disc / 100) * (1 + i.vat / 100), 0);
    let calc = gsum(items);
    // popust na celoten račun (kupon …) v podrobnem izpisu ni pri postavkah → razporedi ga sorazmerno po postavkah
    if (calc && Math.abs(Math.round(calc * 100) - total) > 2 + items.length) {
      const f = total / 100 / calc;
      if (f > 0 && f < 1) {
        items = items.map((i) => ({ ...i, disc: Math.round((1 - (1 - i.disc / 100) * f) * 1000000) / 10000 }));
        calc = gsum(items);
      }
    }
    if (Math.abs(Math.round(calc * 100) - total) > 2 + items.length) { sum.razlika++; (sum._diff = sum._diff || []).length < 25 && sum._diff.push([number, total, Math.round(calc * 100), items.map((i) => `${i.qty}×${i.price}-${i.disc}%@${i.vat}${i.unit}`).join(" ")]); }
    const paidFull = isoDate(r["Plačano v celoti"]);
    const paid = paidFull || (Math.abs(num(r["Plačano"])) >= Math.abs(num(r["Bruto v EUR"])) - 0.01 && num(r["Plačano"]) !== 0 ? date : null);
    const zip = s(r["Pošt. št."]), city = s(r["Kraj"]);
    const partner = s(r["Partner"]);
    invoices.push({
      number, kind, year: Number((date || "2000").slice(0, 4)), seq: parseInt(number.replace(/\D/g, ""), 10) || 0,
      ref_number: kind === "dobropis" ? s(r["Veza Račun DBP"]) || null : null,
      order_id: ord ? ord.id : null, order_status: ord?.status || null,
      issued_at: date ? `${date}T10:00:00+02:00` : null, service_date: isoDate(r["Datum opr. storitve"]) || date, due_date: isoDate(r["Rok plačila"]) || date,
      customer_name: (s(r["Naziv kupca"]) || partner.split(",")[0] || "Kupec").slice(0, 200),
      customer_address: s(r["Ulica"]) || null, customer_zip_city: [zip, city].filter(Boolean).join(" ") || null,
      customer_country: s(r["Država"]) || "Slovenija", customer_vat: s(r["Davčna št."]) || null, customer_email: s(r["Email"]).toLowerCase() || null,
      items, payment: payOf(r["Vrsta plačila"], !!paid), paid_at: paid ? `${paid}T12:00:00+02:00` : null,
      net_cents: net, vat_cents: total - net, total_cents: total,
      notes: [`Arhiv Metakocka (original ${number}).`, shopNo ? `Spletno naročilo Shopify #${shopNo}.` : shopRaw ? `Naročilo: ${shopRaw}.` : "",
        s(r["FURS ZOI"]) ? `ZOI: ${s(r["FURS ZOI"])}` : "", s(r["FURS EOR"]) ? `EOR: ${s(r["FURS EOR"])}` : ""].filter(Boolean).join(" "),
      meta: { shop: shopRaw || null, tip: s(r["Tip"]) || null, dostava: s(r["Dostavna služba"]) || null, placilo: s(r["Vrsta plačila"]) || null,
        eor: s(r["FURS EOR"]) || null, zoi: s(r["FURS ZOI"]) || null, pravna: s(r["Pravna"]) || null },
    });
    sum[kind === "dobropis" ? "dobropisi" : "racuni"]++;
    sum.bruto += total;
    if (ord) sum.shopify_v_bazi++; else if (shopNo) sum.shopify_ni_v_bazi++; else sum.ostali++;
  }

  // nabava (PT Hartmattan …) → prevzemi
  const receipts = [];
  if (files.nabava) {
    const prods = await sql`SELECT code FROM products`;
    const codes = new Set(prods.map((p) => p.code));
    const by = linesBy(tables(files.nabava, "Številka računa"));
    for (const [no, ls] of Object.entries(by)) {
      const items = ls.filter((l) => l.qty > 0).map((l) => {
        const { code, size } = splitCode(l.code, codes);
        return { sku: l.code.replace(/\s+/g, " ").toUpperCase().slice(0, 60), code, name: l.desc.slice(0, 200), size: size || "-", qty: Math.round(l.qty), cost_cents: Math.round(l.price * (1 - l.disc / 100) * 100) };
      });
      if (!items.length) continue;
      receipts.push({ number: `MK-${no}`.slice(0, 60), doc_ref: no, doc_date: ls[0].date || "2023-01-01", supplier: (ls[0].partner.split(",")[0] || "").slice(0, 120),
        items, total_cents: items.reduce((a, i) => a + i.qty * i.cost_cents, 0) });
    }
  }
  sum.prevzemi = receipts.length;
  sum._rec = receipts.map((r) => [r.number, r.doc_date, r.items.reduce((a, i) => a + i.qty, 0), r.total_cents]);
  sum.prevzemi_kosov = receipts.reduce((a, r) => a + r.items.reduce((b, i) => b + i.qty, 0), 0);
  sum.prevzemi_vrednost = receipts.reduce((a, r) => a + r.total_cents, 0);
  sum.postavk = invoices.reduce((a, i) => a + i.items.length, 0);
  return { invoices, receipts, summary: sum };
}

/** Zapiše pripravljen uvoz (ponovni uvoz posodobi iste številke — brez podvajanja). */
export async function writeMk({ invoices, receipts }) {
  const sql = db();
  let inv = 0, rec = 0;
  for (let i = 0; i < invoices.length; i += 100) {
    const part = invoices.slice(i, i + 100);
    await sql`INSERT INTO invoices (number, series, year, seq, kind, ref_number, order_id, status, issued_at, service_date, due_date, place,
        customer_name, customer_address, customer_zip_city, customer_country, customer_vat, customer_email,
        items, prices_gross, payment, notes, net_cents, vat_cents, total_cents, paid_at, meta)
      SELECT x.number, 'MK', x.year, x.seq, x.kind, x.ref_number, x.order_id, 'arhiv', x.issued_at, x.service_date, x.due_date, 'Šmarje pri Jelšah',
        x.customer_name, x.customer_address, x.customer_zip_city, x.customer_country, x.customer_vat, x.customer_email,
        x.items, false, x.payment, x.notes, x.net_cents, x.vat_cents, x.total_cents, x.paid_at, x.meta
      FROM jsonb_to_recordset(${JSON.stringify(part)}::jsonb) AS x(number text, year int, seq int, kind text, ref_number text, order_id bigint,
        issued_at timestamptz, service_date date, due_date date, customer_name text, customer_address text, customer_zip_city text,
        customer_country text, customer_vat text, customer_email text, items jsonb, payment text, notes text,
        net_cents int, vat_cents int, total_cents int, paid_at timestamptz, meta jsonb)
      ON CONFLICT (number) DO UPDATE SET kind = EXCLUDED.kind, ref_number = EXCLUDED.ref_number, order_id = EXCLUDED.order_id,
        issued_at = EXCLUDED.issued_at, service_date = EXCLUDED.service_date, due_date = EXCLUDED.due_date,
        customer_name = EXCLUDED.customer_name, customer_address = EXCLUDED.customer_address, customer_zip_city = EXCLUDED.customer_zip_city,
        customer_country = EXCLUDED.customer_country, customer_vat = EXCLUDED.customer_vat, customer_email = EXCLUDED.customer_email,
        items = EXCLUDED.items, payment = EXCLUDED.payment, notes = EXCLUDED.notes, net_cents = EXCLUDED.net_cents,
        vat_cents = EXCLUDED.vat_cents, total_cents = EXCLUDED.total_cents, paid_at = EXCLUDED.paid_at, meta = EXCLUDED.meta
      WHERE invoices.series = 'MK'`;
    inv += part.length;
  }
  for (const r of receipts) {
    const [row] = await sql`INSERT INTO receipts (number, doc_date, supplier, doc_ref, note, total_cents)
      VALUES (${r.number}, ${r.doc_date}, ${r.supplier}, ${r.doc_ref}, ${"Zgodovina iz Metakocke — zaloga ni bila spremenjena."}, ${r.total_cents})
      ON CONFLICT (number) DO UPDATE SET doc_date = EXCLUDED.doc_date, supplier = EXCLUDED.supplier, total_cents = EXCLUDED.total_cents
      RETURNING id`;
    await sql`DELETE FROM receipt_items WHERE receipt_id = ${row.id}`;
    await sql`INSERT INTO receipt_items (receipt_id, sku, code, name, size, qty, cost_cents)
      SELECT ${row.id}::bigint, * FROM unnest(${r.items.map((i) => i.sku)}::text[], ${r.items.map((i) => i.code)}::text[], ${r.items.map((i) => i.name)}::text[],
        ${r.items.map((i) => i.size)}::text[], ${r.items.map((i) => i.qty)}::int[], ${r.items.map((i) => i.cost_cents)}::int[])`;
    rec++;
  }
  return { invoices: inv, receipts: rec };
}
