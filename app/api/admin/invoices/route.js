import { NextResponse } from "next/server";
import { db, dbConfigured, ensureSchema } from "../../../../lib/db";
import { issueInvoice, invoicePdf, emailInvoice, invoiceFromOrder, getInvSettings, saveInvSettings, computeInvoice } from "../../../../lib/invoices";

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
      "Content-Disposition": `${u.searchParams.get("dl") ? "attachment" : "inline"}; filename="${inv.kind === "dobropis" ? "dobropis" : "racun"}-${inv.number}.pdf"` } });
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
  const rows = order
    ? await sql`SELECT * FROM invoices WHERE order_id = ${order} ORDER BY id DESC`
    : await sql`SELECT * FROM invoices WHERE lower(number || ' ' || customer_name || ' ' || COALESCE(customer_email,'')) LIKE ${q} ORDER BY id DESC LIMIT 300`;
  const [sum] = await sql`SELECT COALESCE(SUM(total_cents),0)::int AS total, COUNT(*)::int AS n FROM invoices
    WHERE status <> 'storniran' AND kind = 'racun' AND date_trunc('month', issued_at) = date_trunc('month', now())`;
  return NextResponse.json({ ok: true, invoices: rows, month: sum });
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
      const pdf = await invoicePdf({ number: "PREDOGLED", kind: "racun", issued_at: now.toISOString(), service_date: b.service_date || now.toISOString().slice(0, 10),
        due_date: new Date(now.getTime() + dd * 86400000).toISOString().slice(0, 10), place: s.place,
        customer_name: b.customer?.name || "", customer_address: b.customer?.address, customer_zip_city: b.customer?.zip_city, customer_country: b.customer?.country,
        customer_vat: b.customer?.vat, items: (b.items || []).filter((i) => String(i.desc || "").trim()), prices_gross: !!b.gross, payment: b.payment, notes: b.notes,
        prepared_by: s.prepared_by, total_cents: calc.total }, s);
      return new NextResponse(pdf, { headers: { "Content-Type": "application/pdf" } });
    }
    if (b.action === "issue") {
      if (!String(b.customer?.name || "").trim()) return NextResponse.json({ ok: false, message: "Vpiši kupca." }, { status: 400 });
      const items = (b.items || []).filter((i) => String(i.desc || "").trim());
      if (!items.length) return NextResponse.json({ ok: false, message: "Dodaj vsaj eno postavko." }, { status: 400 });
      const inv = await issueInvoice({ ...b, items });
      let message = `Račun ${inv.number} je izdan ✓`;
      if (b.send && inv.customer_email) {
        const r = await emailInvoice(inv);
        message += r.error ? ` — pošiljanje ni uspelo: ${r.error.message || r.error.name}` : r.skipped ? " (Resend ni nastavljen)" : ` in poslan na ${inv.customer_email}`;
      }
      return NextResponse.json({ ok: true, invoice: inv, message });
    }
    const [inv] = b.id ? await sql`SELECT * FROM invoices WHERE id = ${b.id}` : [null];
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
      const items = (inv.items || []).map((i) => ({ ...i, qty: -Math.abs(Number(i.qty) || 0) }));
      const cr = await issueInvoice({ kind: "dobropis", ref: inv.number, order_id: inv.order_id, gross: inv.prices_gross, payment: inv.payment, due_days: 0,
        customer: { name: inv.customer_name, address: inv.customer_address, zip_city: inv.customer_zip_city, country: inv.customer_country, vat: inv.customer_vat, email: inv.customer_email },
        items, notes: `Dobropis (storno) k računu št. ${inv.number}.` });
      await sql`UPDATE invoices SET status = 'storniran' WHERE id = ${inv.id}`;
      return NextResponse.json({ ok: true, invoice: cr, message: `Račun ${inv.number} storniran — izdan dobropis ${cr.number}.` });
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
