import crypto from "node:crypto";
import { db } from "./db";
import { send, sendBatch, shell, esc, eur, SITE, mailConfigured } from "./mail";
import { primeCatalog, getAnyProduct } from "./catalog";

/* ---------- podpisi povezav (odjava, ocena) ---------- */
const SECRET = () => crypto.createHash("sha256").update(String(process.env.MAIL_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "69slam")).digest("hex");
export const sign = (...parts) => crypto.createHmac("sha256", SECRET()).update(parts.join("|")).digest("hex").slice(0, 24);
export const unsubUrl = (email, lang = "sl") => `${SITE}/${lang}/odjava?e=${encodeURIComponent(email)}&t=${sign("unsub", String(email).toLowerCase())}`;
export const unsubApi = (email) => `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${sign("unsub", String(email).toLowerCase())}`;
export const reviewUrl = (orderId, lang = "sl") => `${SITE}/${lang}/ocena?o=${orderId}&t=${sign("review", orderId)}`;
const unsubFooter = (email, lang) => `<br><a href="${unsubUrl(email, lang)}" style="color:#999">${lang === "en" ? "Unsubscribe" : "Odjava od e-mailov"}</a>`;

/* ---------- nastavitve samodejnih mailov ---------- */
export const DEFAULTS = { review_on: true, review_days: 10, review_discount: 10, cart_on: true, cart_h1: 1, cart_h2: 24, cart_discount2: 10 };
export async function getSettings() {
  const sql = db();
  const [r] = await sql`SELECT value FROM settings WHERE key = 'mail'`;
  return { ...DEFAULTS, ...(r?.value || {}) };
}
export async function saveSettings(v) {
  const sql = db();
  const clean = { ...DEFAULTS, ...(await getSettings()), ...v };
  await sql`INSERT INTO settings (key, value) VALUES ('mail', ${JSON.stringify(clean)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  return clean;
}

/** Odjava od vseh marketinških mailov (preveri podpis). */
export async function unsubscribe(email, t) {
  email = String(email || "").trim().toLowerCase();
  if (!email || sign("unsub", email) !== t) return false;
  const { dbConfigured, ensureSchema } = await import("./db");
  if (!dbConfigured()) return false;
  await ensureSchema();
  const sql = db();
  await sql`INSERT INTO subscribers (email, lang, source, unsubscribed_at) VALUES (${email}, 'sl', 'odjava', now())
    ON CONFLICT (email) DO UPDATE SET unsubscribed_at = COALESCE(subscribers.unsubscribed_at, now())`;
  await sql`UPDATE mail_jobs SET status = 'preklicano' WHERE lower(email) = ${email} AND status = 'cakajoce'`;
  return true;
}

async function isUnsubscribed(sql, email) {
  const [r] = await sql`SELECT 1 FROM subscribers WHERE lower(email) = lower(${email}) AND unsubscribed_at IS NOT NULL`;
  return !!r;
}

/* ---------- ob novem (plačanem) naročilu ---------- */
export async function afterOrder(orderId) {
  const sql = db();
  const [o] = await sql`SELECT id, email, created_at FROM orders WHERE id = ${orderId}`;
  if (!o) return;
  const s = await getSettings();
  // zapuščene košarice tega kupca so »rešene«
  await sql`UPDATE carts SET recovered_order = ${orderId} WHERE lower(email) = lower(${o.email}) AND recovered_order IS NULL`;
  await sql`UPDATE mail_jobs SET status = 'preklicano' WHERE kind IN ('cart1','cart2') AND status = 'cakajoce'
    AND ref_id IN (SELECT id FROM carts WHERE recovered_order = ${orderId})`;
  if (s.review_on)
    await sql`INSERT INTO mail_jobs (kind, ref_id, email, send_at) VALUES ('review', ${orderId}, ${o.email}, now() + ${`${s.review_days} days`}::interval)
      ON CONFLICT (kind, ref_id) DO NOTHING`;
}

/* ---------- zapuščena košarica: shrani ---------- */
export async function saveCart({ token, email, lang, cart, total }) {
  const sql = db();
  const s = await getSettings();
  const t = token && /^[a-f0-9]{24}$/.test(token) ? token : crypto.randomBytes(12).toString("hex");
  const [c] = await sql`INSERT INTO carts (token, email, lang, cart, total_cents) VALUES (${t}, ${email}, ${lang}, ${JSON.stringify(cart)}::jsonb, ${total})
    ON CONFLICT (token) DO UPDATE SET email = EXCLUDED.email, lang = EXCLUDED.lang, cart = EXCLUDED.cart, total_cents = EXCLUDED.total_cents, updated_at = now()
    RETURNING id, recovered_order`;
  if (s.cart_on && !c.recovered_order) {
    await sql`INSERT INTO mail_jobs (kind, ref_id, email, send_at) VALUES ('cart1', ${c.id}, ${email}, now() + ${`${s.cart_h1} hours`}::interval)
      ON CONFLICT (kind, ref_id) DO UPDATE SET send_at = EXCLUDED.send_at, email = EXCLUDED.email WHERE mail_jobs.status = 'cakajoce'`;
    await sql`INSERT INTO mail_jobs (kind, ref_id, email, send_at) VALUES ('cart2', ${c.id}, ${email}, now() + ${`${s.cart_h2} hours`}::interval)
      ON CONFLICT (kind, ref_id) DO UPDATE SET send_at = EXCLUDED.send_at, email = EXCLUDED.email WHERE mail_jobs.status = 'cakajoce'`;
  }
  return t;
}

/* ---------- pomožno: kartica artikla v mailu ---------- */
function productRow(p, lang, extra = "") {
  if (!p) return "";
  const url = `${SITE}/${lang}/p/${p.slug}`;
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #eee" width="90"><a href="${url}"><img src="${esc(p.img || "")}" width="80" height="96" style="object-fit:cover;border-radius:8px;display:block" alt=""></a></td>
<td style="padding:10px 0 10px 14px;border-bottom:1px solid #eee;font-size:14px"><a href="${url}" style="color:#0a0a0a;text-decoration:none;font-weight:800;text-transform:uppercase">${esc(p.name)}</a><br>
<span style="color:#666;font-size:12px">${esc(p.type || "")}${extra}</span></td></tr>`;
}
const button = (url, text) => `<p style="margin:22px 0 6px"><a href="${url}" style="background:#FF5A1F;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:800;text-transform:uppercase;letter-spacing:.06em;display:inline-block">${text}</a></p>`;

/** Edinstvena koda za popust (1× uporaba). */
async function personalCode(sql, prefix, percent, days, note) {
  const code = `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  await sql`INSERT INTO coupons (code, percent, active, expires_at, once_per_email, max_uses, note)
    VALUES (${code}, ${percent}, true, now() + ${`${days} days`}::interval, true, 1, ${note})`;
  return code;
}

/* ---------- posamezni samodejni maili ---------- */
async function sendReviewRequest(sql, job) {
  const [o] = await sql`SELECT id, number, name, email, lang, status FROM orders WHERE id = ${job.ref_id}`;
  if (!o || o.status === "preklicano") return "preskočeno (preklicano)";
  if (await isUnsubscribed(sql, o.email)) return "preskočeno (odjava)";
  const s = await getSettings();
  await primeCatalog();
  const items = await sql`SELECT DISTINCT v.code FROM order_items i JOIN variants v ON v.sku = i.sku WHERE i.order_id = ${o.id}`;
  const en = o.lang === "en";
  const rows = items.map((r) => productRow(getAnyProduct(r.code), o.lang)).join("");
  const html = shell(en ? "How do you like them? ⭐" : "Kako so ti všeč? ⭐",
    `<p style="font-size:15px;line-height:1.6;margin:0">${en ? `Hi ${esc(o.name.split(" ")[0])}, thank you for your order #${o.number}! Tell us what you think — it takes 30 seconds.` : `Živjo ${esc(o.name.split(" ")[0])}, hvala za tvoje naročilo #${o.number}! Povej nam, kako si zadovoljen/-a — vzame 30 sekund.`}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows}</table>
${s.review_discount ? `<p style="font-size:15px;margin:0">${en ? `As a thank-you you get <b>−${s.review_discount} %</b> on your next order.` : `Za zahvalo dobiš <b>−${s.review_discount} %</b> popusta za naslednji nakup.`}</p>` : ""}
${button(reviewUrl(o.id, o.lang), en ? "Leave a review" : "Oceni artikle")}`, unsubFooter(o.email, o.lang));
  await send({ to: o.email, subject: en ? "How do you like your 69SLAM? ⭐" : "Kako so ti všeč tvoje 69SLAM? ⭐", html });
  return "poslano";
}

async function sendCartReminder(sql, job) {
  const [c] = await sql`SELECT * FROM carts WHERE id = ${job.ref_id}`;
  if (!c || c.recovered_order) return "preskočeno (kupljeno)";
  const [ord] = await sql`SELECT 1 FROM orders WHERE lower(email) = lower(${c.email}) AND created_at > ${c.created_at} AND status <> 'preklicano'`;
  if (ord) return "preskočeno (kupljeno)";
  if (await isUnsubscribed(sql, c.email)) return "preskočeno (odjava)";
  const s = await getSettings();
  await primeCatalog();
  const en = c.lang === "en";
  const lines = [];
  for (const l of c.cart || []) {
    if (l.bundle) for (const x of l.items || []) lines.push([x.id, x.size, "Paket 3"]);
    else lines.push([l.id, l.size, l.qty > 1 ? `${l.qty}×` : ""]);
  }
  const rows = lines.map(([id, size, note]) => productRow(getAnyProduct(id), c.lang, ` · ${en ? "size" : "vel."} ${esc(size)}${note ? " · " + note : ""}`)).join("");
  let codeHtml = "";
  if (job.kind === "cart2" && s.cart_discount2) {
    const code = await personalCode(sql, "KOSARICA", s.cart_discount2, 3, `Zapuščena košarica ${c.email}`);
    codeHtml = `<p style="font-size:15px;margin:16px 0 0;padding:14px;border:2px dashed #FF5A1F;border-radius:12px;text-align:center">${en ? "Your code" : "Tvoja koda"}: <b style="font-size:18px">${code}</b><br><span style="color:#666;font-size:13px">−${s.cart_discount2} % · ${en ? "valid 3 days" : "velja 3 dni"}</span></p>`;
  }
  const url = `${SITE}/${c.lang}/kosarica?c=${c.token}`;
  const first = job.kind === "cart1";
  const html = shell(first ? (en ? "Forgot something? 👀" : "Si kaj pozabil/-a? 👀") : (en ? "Still thinking about it?" : "Še razmišljaš?"),
    `<p style="font-size:15px;line-height:1.6;margin:0">${first
      ? (en ? "Your picks are still waiting in your cart — sizes sell out fast." : "Tvoji izbrani artikli te še čakajo v košarici — velikosti hitro pošle.")
      : (en ? "We saved your cart. Finish your order before your size is gone." : "Košarico smo ti shranili. Zaključi naročilo, preden tvoja velikost poide.")}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows}</table>
${codeHtml}${button(url, en ? "Complete my order" : "Zaključi nakup")}`, unsubFooter(c.email, c.lang));
  await send({ to: c.email, subject: first ? (en ? "Your cart is waiting 🛒" : "Tvoja košarica te čaka 🛒") : (en ? "Last call for your cart" : "Zadnji opomnik za tvojo košarico"), html });
  return "poslano";
}

/** Pošlje vse zapadle samodejne maile (kliče ga cron). */
export async function processJobs(limit = 40) {
  if (!mailConfigured()) return { skipped: "RESEND_API_KEY manjka" };
  const sql = db();
  const jobs = await sql`UPDATE mail_jobs SET status = 'v teku' WHERE id IN (
      SELECT id FROM mail_jobs WHERE status = 'cakajoce' AND send_at <= now() ORDER BY send_at LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING *`;
  const out = [];
  for (const j of jobs) {
    let info;
    try {
      info = j.kind === "review" ? await sendReviewRequest(sql, j) : await sendCartReminder(sql, j);
    } catch (e) { info = "napaka: " + String(e?.message || e).slice(0, 150); }
    await sql`UPDATE mail_jobs SET status = ${info === "poslano" ? "poslano" : info.startsWith("napaka") ? "napaka" : "preskočeno"},
      sent_at = now(), info = ${info} WHERE id = ${j.id}`;
    out.push([j.kind, j.id, info]);
  }
  return { processed: out.length, out };
}

/* ---------- ocena: oddaja ---------- */
export async function submitReviews({ orderId, token, name, reviews }) {
  if (sign("review", orderId) !== token) return { ok: false, message: "Povezava ni veljavna." };
  const sql = db();
  const [o] = await sql`SELECT id, email, name, lang FROM orders WHERE id = ${orderId}`;
  if (!o) return { ok: false, message: "Naročilo ne obstaja." };
  const codes = new Set((await sql`SELECT DISTINCT v.code FROM order_items i JOIN variants v ON v.sku = i.sku WHERE i.order_id = ${orderId}`).map((r) => r.code));
  let n = 0;
  for (const r of reviews || []) {
    const rating = parseInt(r.rating, 10);
    if (!codes.has(r.code) || !(rating >= 1 && rating <= 5)) continue;
    const ins = await sql`INSERT INTO reviews (order_id, code, name, email, rating, title, body)
      VALUES (${orderId}, ${r.code}, ${String(name || o.name).trim().slice(0, 60)}, ${o.email}, ${rating},
        ${String(r.title || "").trim().slice(0, 120) || null}, ${String(r.body || "").trim().slice(0, 2000) || null})
      ON CONFLICT (order_id, code) DO NOTHING RETURNING id`;
    n += ins.length;
  }
  if (!n) return { ok: false, message: o.lang === "en" ? "You have already reviewed these items." : "Te artikle si že ocenil/-a." };
  const s = await getSettings();
  let code = null;
  if (s.review_discount) {
    const [had] = await sql`SELECT code FROM coupons WHERE note = ${"Ocena naročila " + orderId}`;
    code = had?.code || (await personalCode(sql, "HVALA", s.review_discount, 60, "Ocena naročila " + orderId));
  }
  return { ok: true, count: n, code, percent: s.review_discount };
}

/* ---------- kampanje ---------- */
export async function renderCampaign(c, { email = "", lang = "sl" } = {}) {
  await primeCatalog();
  const parts = [];
  for (const b of c.blocks || []) {
    if (b.type === "heading") parts.push(`<h2 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:22px 0 8px">${esc(b.text)}</h2>`);
    else if (b.type === "text") parts.push(`<p style="font-size:15px;line-height:1.65;margin:0 0 14px">${esc(b.text).replace(/\n/g, "<br>")}</p>`);
    else if (b.type === "image" && b.url) parts.push(`<p style="margin:0 0 14px">${b.link ? `<a href="${esc(b.link)}">` : ""}<img src="${esc(b.url)}" width="544" style="width:100%;max-width:544px;border-radius:12px;display:block" alt="">${b.link ? "</a>" : ""}</p>`);
    else if (b.type === "button" && b.url) parts.push(button(esc(b.url), esc(b.text || "Poglej")));
    else if (b.type === "products") {
      const ps = (b.codes || []).map((code) => getAnyProduct(code)).filter(Boolean);
      const cells = ps.map((p) => {
        const url = `${SITE}/${lang}/p/${p.slug}`;
        const price = p.outlet || p.sale ? `<s style="color:#999">${eur(p.price * 100)}</s> <b style="color:#e63946">${eur(p.effPrice * 100)}</b>` : `<b>${eur(p.price * 100)}</b>`;
        return `<td width="50%" valign="top" style="padding:6px"><a href="${url}" style="text-decoration:none;color:#0a0a0a">
<img src="${esc(p.img || "")}" width="260" style="width:100%;border-radius:10px;display:block;aspect-ratio:4/5;object-fit:cover" alt="">
<div style="font-weight:800;text-transform:uppercase;font-size:13px;margin-top:8px">${esc(p.name)}</div>
<div style="font-size:14px;margin-top:2px">${price}</div>
<div style="margin-top:8px;display:inline-block;background:#0a0a0a;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:800;text-transform:uppercase">${lang === "en" ? "Shop" : "Kupi"}</div></a></td>`;
      });
      let rows = "";
      for (let i = 0; i < cells.length; i += 2) rows += `<tr>${cells[i]}${cells[i + 1] || '<td width="50%"></td>'}</tr>`;
      parts.push(`<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px">${rows}</table>`);
    }
  }
  const pre = c.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${esc(c.preheader)}</div>` : "";
  return shell(esc(c.title || ""), pre + parts.join(""), email ? unsubFooter(email, lang) : "");
}

/** Naročniki, ki jim kampanja še ni bila poslana. */
export async function campaignPending(sql, id) {
  const [r] = await sql`SELECT COUNT(*)::int AS n FROM subscribers s WHERE s.unsubscribed_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM campaign_sends x WHERE x.campaign_id = ${id} AND x.email = lower(s.email))`;
  return r.n;
}

/** Pošlje kampanjo (po 100 naenkrat) vsem aktivnim naročnikom, ki je še niso dobili. Vrne število poslanih. */
export async function sendCampaign(id, max = 1000) {
  const sql = db();
  const [c] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
  if (!c) return { ok: false, message: "Kampanja ne obstaja." };
  if (!mailConfigured()) return { ok: false, message: "Resend ni nastavljen (RESEND_API_KEY)." };
  await sql`UPDATE campaigns SET status = 'v pošiljanju', error = NULL WHERE id = ${id}`;
  let sent = 0, error = null;
  while (sent < max) {
    const batch = await sql`SELECT lower(s.email) AS email, s.lang FROM subscribers s WHERE s.unsubscribed_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM campaign_sends x WHERE x.campaign_id = ${id} AND x.email = lower(s.email))
      ORDER BY s.id LIMIT ${Math.min(100, max - sent)}`;
    if (!batch.length) break;
    const list = [];
    for (const r of batch) list.push({ to: r.email, subject: c.subject, unsub: unsubApi(r.email),
      html: await renderCampaign(c, { email: r.email, lang: c.lang || "sl" }) });
    const res = await sendBatch(list);
    if (res.error) { error = String(res.error.message || res.error.name || res.error); break; }
    const emails = batch.map((r) => r.email);
    await sql`INSERT INTO campaign_sends (campaign_id, email) SELECT ${id}, e FROM unnest(${emails}::text[]) AS t(e) ON CONFLICT DO NOTHING`;
    sent += batch.length;
  }
  const left = await campaignPending(sql, id);
  const [cnt] = await sql`SELECT COUNT(*)::int AS n FROM campaign_sends WHERE campaign_id = ${id}`;
  await sql`UPDATE campaigns SET sent_count = ${cnt.n}, status = ${left ? "v pošiljanju" : "poslano"},
    sent_at = CASE WHEN ${left} = 0 THEN now() ELSE sent_at END, error = ${error} WHERE id = ${id}`;
  return { ok: !error, sent, left, error };
}
