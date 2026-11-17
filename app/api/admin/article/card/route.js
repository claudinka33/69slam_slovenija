import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db, dbConfigured, ensureSchema } from "../../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const norm = (s) => String(s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const SIZE_RE = /(?:^|[\s-])((?:\d?X{0,3}[SML])|XS|XXL|XXXL|\d{1,3}(?:\/\d{1,3})?|UNI|ONE ?SIZE)$/i;

/**
 * Kartica artikla: vsi premiki zaloge (nova trgovina) + zgodovina iz Metakocke (arhiv računov in prevzemov).
 * ?code=MBYKOR [&size=M] [&from=2026-01-01] [&to=2026-12-31] [&format=xlsx]
 */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  const u = new URL(req.url);
  const code = String(u.searchParams.get("code") || "").trim();
  const size = String(u.searchParams.get("size") || "").trim();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("from") || "") ? u.searchParams.get("from") : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get("to") || "") ? u.searchParams.get("to") : null;
  if (!code) return NextResponse.json({ ok: false, message: "Manjka šifra artikla." }, { status: 400 });
  const sql = db();
  await ensureSchema();
  try {
    const [[prod], variants] = await Promise.all([
      sql`SELECT code, name, cost_cents FROM products WHERE code = ${code}`,
      sql`SELECT sku, size, stock FROM variants WHERE code = ${code}`,
    ]);
    if (!prod) return NextResponse.json({ ok: false, message: "Artikel ne obstaja." }, { status: 404 });
    const skus = variants.map((v) => v.sku);
    const sizeOfSku = new Map(variants.map((v) => [v.sku, v.size]));
    const sizeOfNorm = new Map(variants.map((v) => [norm(v.sku), v.size]));
    const nc = norm(code);

    const [moves, mkInv, mkRec] = await Promise.all([
      skus.length ? sql`SELECT id, sku, delta, reason, note, created_at FROM stock_moves WHERE sku = ANY(${skus}) ORDER BY created_at, id` : [],
      sql`SELECT i.number, i.kind, i.issued_at, i.customer_name, it->>'code' AS icode, it->>'desc' AS idesc,
            COALESCE((it->>'qty')::numeric, 0) AS qty, COALESCE((it->>'price')::numeric, 0) AS price, COALESCE((it->>'disc')::numeric, 0) AS disc
          FROM invoices i, jsonb_array_elements(i.items) it
          WHERE i.series = 'MK' AND upper(regexp_replace(COALESCE(it->>'code', ''), '[^A-Za-z0-9]', '', 'g')) LIKE ${nc + "%"}`,
      sql`SELECT r.number, r.doc_date, r.supplier, ri.sku, ri.size, ri.qty, ri.cost_cents
          FROM receipt_items ri JOIN receipts r ON r.id = ri.receipt_id
          WHERE r.note LIKE 'Zgodovina iz Metakocke%'
            AND (ri.code = ${code} OR upper(regexp_replace(ri.sku, '[^A-Za-z0-9]', '', 'g')) LIKE ${nc + "%"})`,
    ]);

    // povezave iz opomb: naročila (#N, id N), računi (številke), prevzemi
    const orderNums = new Set(), orderIds = new Set(), tokens = new Set(), recNums = new Set();
    for (const m of moves) {
      const n = String(m.note || "");
      for (const x of n.matchAll(/#(\d+)/g)) orderNums.add(x[1]);
      for (const x of n.matchAll(/\(id (\d+)\)/g)) orderIds.add(x[1]);
      const pr = n.match(/^Prevzem (\S+)/); if (pr) recNums.add(pr[1]);
      for (const t of n.split(/[\s,;()]+/)) if (/\d/.test(t) && t.length >= 4) tokens.add(t.replace(/[.:]+$/, ""));
    }
    const [ords, invs, recs] = await Promise.all([
      orderNums.size || orderIds.size
        ? sql`SELECT id, number, name, city, total_cents FROM orders WHERE number::text = ANY(${[...orderNums]}) OR id::text = ANY(${[...orderIds]})` : [],
      tokens.size ? sql`SELECT number, kind, customer_name FROM invoices WHERE number = ANY(${[...tokens]})` : [],
      recNums.size ? sql`SELECT number, supplier, doc_ref FROM receipts WHERE number = ANY(${[...recNums]})` : [],
    ]);
    const oByNum = new Map(ords.map((o) => [String(o.number), o])), oById = new Map(ords.map((o) => [String(o.id), o]));
    const iByNum = new Map(invs.map((i) => [i.number, i])), rByNum = new Map(recs.map((r) => [r.number, r]));

    const rows = [];
    for (const m of moves) {
      const n = String(m.note || "");
      const o = oByNum.get((n.match(/#(\d+)/) || [])[1]) || oById.get((n.match(/\(id (\d+)\)/) || [])[1]);
      const inv = [...n.split(/[\s,;()]+/)].map((t) => iByNum.get(t.replace(/[.:]+$/, ""))).find(Boolean);
      const rec = rByNum.get((n.match(/^Prevzem (\S+)/) || [])[1]);
      let type, label, who = "", doc = "";
      switch (m.reason) {
        case "uvoz": type = "zacetna"; label = "Začetna zaloga"; doc = n; break;
        case "prejem": type = "prevzem"; label = "Prevzem blaga"; who = rec?.supplier || ""; doc = rec ? `Prevzem ${rec.number}${rec.doc_ref ? " · " + rec.doc_ref : ""}` : n; break;
        case "narocilo": type = m.delta < 0 ? "prodaja" : "vracilo"; label = m.delta < 0 ? "Spletno naročilo" : "Popravek naročila"; who = o ? `${o.name}${o.city ? ", " + o.city : ""}` : ""; doc = o ? `Naročilo #${o.number}` : n; break;
        case "prodaja": type = "prodaja"; label = "Prodaja (račun)"; who = inv?.customer_name || ""; doc = inv ? inv.number : n; break;
        case "preklic": type = "vracilo"; label = "Preklic naročila"; who = o?.name || ""; doc = o ? `Naročilo #${o.number}` : n; break;
        case "vracilo": type = "vracilo"; label = "Vračilo"; who = inv?.customer_name || o?.name || ""; doc = inv?.number || n; break;
        case "inventura": type = "inventura"; label = "Inventura"; doc = n; break;
        default: type = "popravek"; label = "Ročni popravek"; doc = n;
      }
      rows.push({ src: "nova", id: `m${m.id}`, date: m.created_at, size: sizeOfSku.get(m.sku) || "", delta: m.delta, type, label, who, doc, note: n });
    }
    for (const r of mkInv) {
      const q = Math.round(Number(r.qty) || 0);
      if (!q) continue;
      const raw = String(r.icode || "");
      const sz = sizeOfNorm.get(norm(raw)) || ((raw.match(SIZE_RE) || [])[1] || "").toUpperCase();
      const ret = r.kind === "dobropis" || q < 0;
      const price = Math.round(Number(r.price) * (1 - Number(r.disc) / 100) * 100);
      rows.push({ src: "mk", id: `i${r.number}${raw}`, date: r.issued_at, size: sz, delta: -q, type: ret ? "vracilo" : "prodaja",
        label: ret ? "Vračilo (Metakocka)" : "Prodaja (Metakocka)", who: r.customer_name || "", doc: r.number, price_cents: price });
    }
    for (const r of mkRec) {
      const sz = r.size && r.size !== "-" ? r.size : sizeOfNorm.get(norm(r.sku)) || ((String(r.sku).match(SIZE_RE) || [])[1] || "").toUpperCase();
      rows.push({ src: "mk", id: `r${r.number}${r.sku}`, date: r.doc_date, size: sz, delta: r.qty, type: "prevzem", label: "Prevzem (Metakocka)",
        who: r.supplier || "", doc: r.number, price_cents: r.cost_cents });
    }

    // stanje po premiku (samo premiki nove trgovine — vplivajo na zalogo), računano nazaj od trenutne zaloge
    const inSize = (r) => !size || r.size === size;
    const stockNow = variants.filter((v) => !size || v.size === size).reduce((a, v) => a + v.stock, 0);
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    let run = stockNow;
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.src !== "nova" || !inSize(r)) continue;
      r.after = run; run -= r.delta;
    }
    const d = (x) => new Date(x).toISOString().slice(0, 10);
    const list = rows.filter((r) => inSize(r) && (!from || d(r.date) >= from) && (!to || d(r.date) <= to)).reverse();

    const sum = { prevzeto: 0, prodano: 0, vrnjeno: 0, kupcev: 0, zadnjiPrevzem: null, zadnjaProdaja: null };
    const buyers = new Set();
    for (const r of list) {
      if (r.type === "prevzem") { sum.prevzeto += r.delta; if (!sum.zadnjiPrevzem) sum.zadnjiPrevzem = r.date; }
      if (r.type === "prodaja") { sum.prodano += -r.delta; if (r.who) buyers.add(r.who.toLowerCase()); if (!sum.zadnjaProdaja) sum.zadnjaProdaja = r.date; }
      if (r.type === "vracilo") sum.vrnjeno += r.delta;
    }
    sum.kupcev = buyers.size;

    if (u.searchParams.get("format") === "xlsx") {
      const fmt = (x) => new Date(x).toLocaleDateString("sl-SI", { timeZone: "Europe/Ljubljana" });
      const sheet = list.map((r) => ({
        "Datum": fmt(r.date), "Velikost": r.size, "Količina": r.delta, "Vrsta": r.label, "Kupec / dobavitelj": r.who,
        "Dokument": r.doc, "Cena / kos (€ brez DDV)": r.price_cents != null ? r.price_cents / 100 : "", "Stanje po": r.after ?? "", "Vir": r.src === "mk" ? "Metakocka" : "Nova trgovina",
      }));
      const wb = XLSX.utils.book_new();
      const head = [
        { "": "Artikel", " ": `${prod.code} · ${prod.name}` },
        { "": "Zaloga zdaj", " ": stockNow + (size ? ` (velikost ${size})` : "") },
        { "": "Prevzeto", " ": sum.prevzeto }, { "": "Prodano", " ": sum.prodano }, { "": "Vrnjeno", " ": sum.vrnjeno },
        { "": "Obdobje", " ": `${from || "od začetka"} – ${to || "danes"}` },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.length ? sheet : [{ "Ni premikov": "" }]), "Kartica");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(head), "Povzetek");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new NextResponse(buf, { headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kartica-${code}${size ? "-" + size : ""}.xlsx"`,
      } });
    }

    return NextResponse.json({
      ok: true, product: { code: prod.code, name: prod.name, cost_cents: prod.cost_cents },
      variants, stockNow, summary: sum, rows: list, mkCount: rows.filter((r) => r.src === "mk").length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Napaka: " + String(e?.message || e).slice(0, 300) }, { status: 500 });
  }
}
