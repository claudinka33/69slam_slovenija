import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { issueInvoice, invoicePdf, emailInvoice, invoiceFromOrder, getInvSettings, saveInvSettings, computeInvoice, convertToInvoice, docsForNewOrder, KIND_FILE, creditable, creditNote, stockRule, takeStock, returnTakenStock, KIND_NAME } from "../../../../lib/invoices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Seznam računov | ?pdf=ID (PDF) | ?customers=1 (pretekli kupci za hitro izbiro) | ?settings=1 | ?order=ID */
export async function GET(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, invoices: [] });
  await ensureSchema();
  const sql = db();
  const u = new URL(req.url);
  const pdfId = u.searchParams.get("pdf");
  if (pdfId) {
    const [inv] = await sql`SELECT * FROM invoices WHERE id = ${pdfId}`;
    if (!inv) return new NextResponse("Ni računa.", { status: 404 });
    const pdf = await invoicePdf(inv);
    return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf",
      "Content-Disposition": `${u.searchParams.get("dl") ? "attachment" : "inline"}; filename="${KIND_FILE[inv.kind] || "racun"}-${inv.number}.pdf"` } });
  }
  if (u.searchParams.get("drafts")) {
    const rows = await sql`SELECT id, kind, title, total_cents, data, updated_at FROM invoice_drafts ORDER BY updated_at DESC`;
    return NextResponse.json({ ok: true, drafts: rows });
  }
  if (u.searchParams.get("stockcheck")) {
    const docs = await sql`SELECT id, number, kind, customer_name, issued_at, items, source_id, order_id, series, meta, status FROM invoices
      WHERE series <> 'MK' AND order_id IS NULL AND kind IN ('dobavnica','racun') AND status <> 'storniran' AND (meta->'stock') IS NULL ORDER BY id`;
    const out = [];
    for (const d of docs) if (await stockRule(sql, d)) out.push({ id: d.id, number: d.number, kind: d.kind, customer: d.customer_name, issued_at: d.issued_at,
      lines: (d.items || []).filter((l) => String(l.code || "").trim() && Number(l.qty) > 0).map((l) => ({ code: l.code, desc: l.desc, qty: l.qty })) });
    return NextResponse.json({ ok: true, docs: out });
  }
  if (u.searchParams.get("settings")) return NextResponse.json({ ok: true, settings: await getInvSettings() });
  if (u.searchParams.get("customers")) {
    const rows = await sql`SELECT DISTINCT ON (lower(customer_name)) customer_name AS name, customer_address AS address, customer_zip_city AS zip_city,
        customer_country AS country, customer_vat AS vat, customer_email AS email
      FROM invoices WHERE order_id IS NULL ORDER BY lower(customer_name), id DESC`;
    return NextResponse.json({ ok: true, customers: rows });
  }
  const order = u.searchParams.get("order");
  const q = `%${(u.searchParams.get("q") || "").toLowerCase()}%`;
  const k = u.searchParams.get("kind");
  const kinds = k === "predracun" ? ["predracun"] : k === "dobavnica" ? ["dobavnica"] : k === "dobropis" ? ["dobropis"] : k === "arhiv" ? ["racun", "dobropis"] : ["racun"];
  const cid = u.searchParams.get("credit");
  if (cid) {
    const [inv] = await sql`SELECT * FROM invoices WHERE id = ${cid}`;
    if (!inv) return NextResponse.json({ ok: false, message: "Ni računa." }, { status: 404 });
    return NextResponse.json({ ok: true, invoice: inv, rest: await creditable(inv) });
  }
  const arhiv = k === "arhiv"; // arhiv Metakocke (serija MK)
  const rows = order
    ? await sql`SELECT * FROM invoices WHERE order_id = ${order} ORDER BY issued_at DESC, id DESC`
    : await sql`SELECT i.*, o.number AS order_number, o.status AS order_status,
          (SELECT COALESCE(SUM(-d.total_cents), 0)::int FROM invoices d WHERE d.kind = 'dobropis' AND d.source_id = i.id AND d.status <> 'storniran') AS credited
        FROM invoices i LEFT JOIN orders o ON o.id = i.order_id
        WHERE i.kind = ANY(${kinds}) AND (i.series = 'MK') = ${arhiv}
          AND lower(i.number || ' ' || i.customer_name || ' ' || COALESCE(i.customer_email,'') || ' ' || COALESCE(o.number::text,'') || ' ' || COALESCE(i.meta->>'shop','')) LIKE ${q}
        ORDER BY i.issued_at DESC, i.id DESC LIMIT ${arhiv ? 1000 : 300}`;
  const [sum] = arhiv
    ? await sql`SELECT COALESCE(SUM(total_cents),0)::int AS total, COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE kind = 'dobropis')::int AS dbp, COUNT(order_id)::int AS linked FROM invoices WHERE series = 'MK'`
    : await sql`SELECT COALESCE(SUM(total_cents),0)::int AS total, COUNT(*)::int AS n FROM invoices
    WHERE status <> 'storniran' AND kind = 'racun' AND series <> 'MK' AND date_trunc('month', issued_at) = date_trunc('month', now())`;
  return NextResponse.json({ ok: true, invoices: order ? rows : rows.map(({ items, ...r }) => r), month: sum });
}

/** { action: "issue" | "preview" | "send" | "storno" | "paid" | "order" | "settings", ... } */
export async function POST(req) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, message: "Baza ni povezana." }, { status: 503 });
  await ensureSchema();
  const sql = db();
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === "settings") return NextResponse.json({ ok: true, settings: await saveInvSettings(b.settings || {}), message: "Nastavitve shranjene ✓" });
    if (b.action === "preview") {
      const s = await getInvSettings();
      const calc = computeInvoice(b.items, !!b.gross);
      const now = new Date();
      const dd = b.payment === "trr" ? Number(b.due_days ?? s.due_days) : 0;
      const pdf = await invoicePdf({ number: "PREDOGLED", kind: b.kind || "racun", tracking: b.tracking, issued_at: now.toISOString(), service_date: b.service_date || now.toISOString().slice(0, 10),
        due_date: new Date(now.getTime() + dd * 86400000).toISOString().slice(0, 10), place: s.place,
        customer_name: b.customer?.name || "", customer_address: b.customer?.address, customer_zip_city: b.customer?.zip_city, customer_country: b.customer?.country,
        customer_vat: b.customer?.vat, items: (b.items || []).filter((i) => String(i.desc || "").trim()), prices_gross: !!b.gross, payment: b.payment, notes: b.notes,
        prepared_by: s.prepared_by, total_cents: calc.total }, s);
      return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf" } });
    }
    if (b.action === "draft_save") {
      const d = b.data || {};
      const calc = computeInvoice((d.items || []).filter((i) => String(i.desc || "").trim()), !!d.gross);
      const title = String(d.customer?.name || "").trim().slice(0, 200) || "(brez kupca)";
      const [r] = b.draft_id
        ? await sql`UPDATE invoice_drafts SET kind = ${d.kind || "racun"}, title = ${title}, total_cents = ${calc.total}, data = ${JSON.stringify(d)}::jsonb, updated_at = now()
            WHERE id = ${b.draft_id} RETURNING id`
        : await sql`INSERT INTO invoice_drafts (kind, title, total_cents, data) VALUES (${d.kind || "racun"}, ${title}, ${calc.total}, ${JSON.stringify(d)}::jsonb) RETURNING id`;
      return NextResponse.json({ ok: !!r, draft_id: r?.id, message: r ? "Osnutek shranjen ✓ — še ni izdan, lahko ga spreminjaš." : "Osnutka ni več." });
    }
    if (b.action === "draft_delete") {
      await sql`DELETE FROM invoice_drafts WHERE id = ${b.draft_id}`;
      return NextResponse.json({ ok: true, message: "Osnutek izbrisan." });
    }
    if (b.action === "issue") {
      if (!String(b.customer?.name || "").trim()) return NextResponse.json({ ok: false, message: "Vpiši kupca." }, { status: 400 });
      const items = (b.items || []).filter((i) => String(i.desc || "").trim());
      if (!items.length) return NextResponse.json({ ok: false, message: "Dodaj vsaj eno postavko." }, { status: 400 });
      const inv = await issueInvoice({ ...b, items });
      if (b.draft_id) await sql`DELETE FROM invoice_drafts WHERE id = ${b.draft_id}`;
      let message = `${inv.number} je izdan ✓`;
      const st = inv.stockResult;
      if (st?.ok?.length) message += ` · z zaloge: ${st.ok.join(", ")}`;
      if (st?.unknown?.length) message += ` · ⚠️ ni v zalogi (popravi ročno): ${st.unknown.join(", ")}`;
      if (b.send && inv.customer_email) {
        const r = await emailInvoice(inv);
        message += r.error ? ` — pošiljanje ni uspelo: ${r.error.message || r.error.name}` : r.skipped ? " (Resend ni nastavljen)" : ` in poslan na ${inv.customer_email}`;
      }
      return NextResponse.json({ ok: true, invoice: inv, message });
    }
    const [inv] = b.id ? await sql`SELECT * FROM invoices WHERE id = ${b.id}` : [null];
    if (inv?.series === "MK" && ["paid", "storno", "convert", "credit"].includes(b.action))
      return NextResponse.json({ ok: false, message: "Arhivski račun iz Metakocke je samo za branje." }, { status: 400 });
    if (b.action === "update" && inv) {
      if (inv.kind !== "predracun" || inv.series === "MK" || inv.order_id || inv.converted_to || inv.status !== "izdan")
        return NextResponse.json({ ok: false, message: "Urejati je mogoče samo ročni predračun, iz katerega še ni narejen račun." }, { status: 400 });
      const items = (b.items || []).filter((i) => String(i.desc || "").trim());
      if (!items.length) return NextResponse.json({ ok: false, message: "Dodaj vsaj eno postavko." }, { status: 400 });
      const calc = computeInvoice(items, !!b.gross);
      const c = b.customer || {};
      const dueDays = b.due_days != null ? Number(b.due_days) : 8;
      const due = new Date(new Date(inv.issued_at).getTime() + dueDays * 86400000).toISOString().slice(0, 10);
      const [u] = await sql`UPDATE invoices SET customer_name = ${String(c.name || "").slice(0, 200)}, customer_address = ${c.address || null}, customer_zip_city = ${c.zip_city || null},
          customer_country = ${c.country || "Slovenija"}, customer_vat = ${c.vat || null}, customer_email = ${c.email || null},
          items = ${JSON.stringify(calc.lines.map(({ amount, ...x }) => x))}::jsonb, prices_gross = ${!!b.gross}, payment = ${b.payment || "trr"}, notes = ${b.notes || null},
          service_date = ${b.service_date || inv.service_date}, due_date = ${due}, net_cents = ${calc.net}, vat_cents = ${calc.vat}, total_cents = ${calc.total}
        WHERE id = ${inv.id} RETURNING *`;
      let message = `${u.number} posodobljen ✓`;
      if (b.send && u.customer_email) {
        const r = await emailInvoice(u);
        message += r.error ? ` — pošiljanje ni uspelo: ${r.error.message || r.error.name}` : r.skipped ? " (Resend ni nastavljen)" : ` in poslan na ${u.customer_email}`;
      }
      return NextResponse.json({ ok: true, invoice: u, message });
    }
    if (b.action === "takestock" && inv) {
      const r = await takeStock(inv, `${KIND_NAME[inv.kind]} ${inv.number} (naknadno)`);
      return NextResponse.json({ ok: true, message: `${inv.number}: ${r.ok.join(", ") || "nič za odšteti"}${r.unknown.length ? " · ⚠️ ni v zalogi: " + r.unknown.join(", ") : ""}` });
    }
    if (b.action === "send") {
      if (!inv) return NextResponse.json({ ok: false, message: "Ni računa." }, { status: 404 });
      const to = String(b.to || inv.customer_email || "").trim();
      if (!to) return NextResponse.json({ ok: false, message: "Vpiši e-mail prejemnika." }, { status: 400 });
      const r = await emailInvoice(inv, to);
      return NextResponse.json({ ok: !r.error && !r.skipped, message: r.skipped ? "Resend ni nastavljen." : r.error ? "Resend: " + (r.error.message || r.error.name) : `Poslano na ${to} ✓` });
    }
    if (b.action === "paid" && inv) {
      await sql`UPDATE invoices SET paid_at = CASE WHEN paid_at IS NULL THEN now() ELSE NULL END WHERE id = ${inv.id}`;
      return NextResponse.json({ ok: true });
    }
    if (b.action === "storno" && inv) {
      if (inv.status === "storniran" || inv.kind === "dobropis") return NextResponse.json({ ok: false, message: "Tega računa ni mogoče stornirati." }, { status: 400 });
      const rest = await creditable(inv);
      const items = (inv.items || []).map((i, k) => ({ ...i, qty: -rest[k], src: k })).filter((i) => i.qty);
      if (!items.length) return NextResponse.json({ ok: false, message: "Račun je že v celoti dobropisan." }, { status: 400 });
      const cr = await issueInvoice({ kind: "dobropis", ref: inv.number, source_id: inv.id, order_id: inv.order_id, gross: inv.prices_gross, payment: inv.payment, due_days: 0,
        customer: { name: inv.customer_name, address: inv.customer_address, zip_city: inv.customer_zip_city, country: inv.customer_country, vat: inv.customer_vat, email: inv.customer_email },
        items, notes: `Dobropis (storno) k računu št. ${inv.number}.` });
      await sql`UPDATE invoices SET status = 'storniran' WHERE id = ${inv.id}`;
      const back = await returnTakenStock(inv, `Storno ${inv.number}`);
      return NextResponse.json({ ok: true, invoice: cr, message: `Račun ${inv.number} storniran — izdan dobropis ${cr.number}.${back.length ? " Na zalogo: " + back.join(", ") : ""}` });
    }
    if (b.action === "credit" && inv) {
      const r = await creditNote(inv.id, b);
      let message = `Dobropis ${r.invoice.number} izdan ✓`;
      if (r.stock.ok.length) message += ` · na zalogo: ${r.stock.ok.join(", ")}`;
      if (r.stock.unknown.length) message += ` · ⚠️ ni v zalogi (popravi ročno): ${r.stock.unknown.join(", ")}`;
      if (r.mail) message += r.mail.error ? ` · pošiljanje ni uspelo` : r.mail.skipped ? " · (Resend ni nastavljen)" : ` · poslan na ${r.invoice.customer_email}`;
      return NextResponse.json({ ok: true, invoice: r.invoice, message });
    }
    if (b.action === "convert" && inv) {
      const r = await convertToInvoice(inv.id);
      return NextResponse.json({ ok: true, invoice: r, message: `Narejen račun ${r.number} ✓` });
    }
    if (b.action === "orderdocs") {
      const r = await docsForNewOrder(b.order_id);
      return NextResponse.json({ ok: true, message: r.dobavnica ? `Dobavnica ${r.dobavnica.number} ✓` : "Ni naročila." });
    }
    if (b.action === "order") {
      const r = await invoiceFromOrder(b.order_id);
      return NextResponse.json({ ok: !!r, invoice: r, message: r ? `Račun ${r.number} ✓` : "Naročilo ne obstaja." });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, message: "Napaka: " + String(e?.message || e).slice(0, 200) }, { status: 500 });
  }
  return NextResponse.json({ ok: false, message: "Neznano dejanje." }, { status: 400 });
}
