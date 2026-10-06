import crypto from "node:crypto";
import { db } from "./db";
import { send, sendBatch, shell, esc, eur, SITE, mailConfigured, mailButton, mailLang, productRow as pRow } from "./mail";
import { tx } from "./i18n";
import { primeCatalog, getAnyProduct } from "./catalog";

/* ---------- podpisi povezav (odjava, ocena) ---------- */
const SECRET = () => crypto.createHash("sha256").update(String(process.env.MAIL_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "69slam")).digest("hex");
export const sign = (...parts) => crypto.createHmac("sha256", SECRET()).update(parts.join("|")).digest("hex").slice(0, 24);
export const unsubUrl = (email, lang = "sl") => `${SITE}/${lang}/odjava?e=${encodeURIComponent(email)}&t=${sign("unsub", String(email).toLowerCase())}`;
export const unsubApi = (email) => `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${sign("unsub", String(email).toLowerCase())}`;
export const reviewUrl = (orderId, lang = "sl") => `${SITE}/${lang}/ocena?o=${orderId}&t=${sign("review", orderId)}`;
const unsubFooter = (email, lang) => `<br><a href="${unsubUrl(email, lang)}" style="color:#999">${tx(lang, "Odjava od e-mailov", "Unsubscribe", "Odjava od e-mailova")}</a>`;

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

/* ---------- pomožno ---------- */
const prodRow = (p, lang, sub = "") => (p ? pRow({ img: p.img, name: p.name, url: `${SITE}/${lang}/p/${p.slug}`, sub: esc(p.type || "") + sub }) : "");
const button = (url, text) => mailButton(url, text);
const codeBox = (code, pct, note, lang) => `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;border:2px dashed #FF5A1F;border-radius:14px;background:#fff8f4"><tr><td align="center" style="padding:16px">
<div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#666">${tx(lang, "Tvoja koda", "Your code", "Tvoj kod")} · −${pct} %</div>
<div style="font-size:24px;font-weight:900;letter-spacing:.08em;margin:4px 0 2px">${code}</div>
<div style="font-size:12.5px;color:#666">${note}</div></td></tr></table>`;

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
  const { html, subject } = renderReview(o, items.map((r) => getAnyProduct(r.code)).filter(Boolean), s);
  await send({ to: o.email, subject, html });
  return "poslano";
}

/** Mail »Hvala + oceni« (tudi za predogled). */
export function renderReview(o, products, s) {
  const lang = mailLang(o.lang);
  const t = (sl, e, hr) => tx(lang, sl, e, hr);
  const url = reviewUrl(o.id, lang);
  const stars = `<table cellpadding="0" cellspacing="0" style="margin:16px 0 4px"><tr>${[1, 2, 3, 4, 5].map((n) => `<td style="padding-right:4px"><a href="${url}" style="text-decoration:none;font-size:30px;color:#FFB800">★</a></td>`).join("")}</tr></table>`;
  const first = esc(o.name.split(" ")[0]);
  const html = shell(t("Kako so ti všeč? ⭐", "How do you like them? ⭐", "Kako ti se sviđaju? ⭐"),
    `<p style="font-size:15px;line-height:1.65;margin:0">${t(`Živjo ${first}, hvala, ker si nakupoval/-a pri nas! Tvoje naročilo <b>#${o.number}</b> je že pri tebi — zanima nas, kako ti sede.`, `Hi ${first}, thank you for shopping with us! Your order <b>#${o.number}</b> should be with you by now — we'd love to hear how it fits.`, `Bok ${first}, hvala što si kupovao/-la kod nas! Tvoja narudžba <b>#${o.number}</b> već je kod tebe — zanima nas kako ti sjedi.`)}</p>
${stars}
<p style="font-size:13px;color:#666;margin:0">${t("Klikni na zvezdice — vzame 30 sekund.", "Tap the stars — it takes 30 seconds.", "Klikni na zvjezdice — treba ti 30 sekundi.")}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${products.map((p) => prodRow(p, lang)).join("")}</table>
${s.review_discount ? `<p style="font-size:15px;line-height:1.6;margin:0">🎁 ${t(`Za zahvalo takoj po oddaji dobiš <b>kodo za −${s.review_discount} %</b> za naslednji nakup.`, `As a thank-you you get a <b>−${s.review_discount} % code</b> for your next order right after you submit.`, `Kao zahvalu odmah nakon slanja dobivaš <b>kod za −${s.review_discount} %</b> za sljedeću kupnju.`)}</p>` : ""}
${button(url, t("Oceni artikle", "Leave a review", "Ocijeni proizvode"))}`, unsubFooter(o.email, lang), { lang, pre: t("Povej nam, kako si zadovoljen/-a, in dobi popust", "Tell us what you think and get a discount", "Reci nam koliko si zadovoljan/-na i dobij popust") });
  return { html, subject: t("Kako so ti všeč tvoje 69SLAM? ⭐", "How do you like your 69SLAM? ⭐", "Kako ti se sviđa tvoj 69SLAM? ⭐") };
}

async function sendCartReminder(sql, job) {
  const [c] = await sql`SELECT * FROM carts WHERE id = ${job.ref_id}`;
  if (!c || c.recovered_order) return "preskočeno (kupljeno)";
  const [ord] = await sql`SELECT 1 FROM orders WHERE lower(email) = lower(${c.email}) AND created_at > ${c.created_at} AND status <> 'preklicano'`;
  if (ord) return "preskočeno (kupljeno)";
  if (await isUnsubscribed(sql, c.email)) return "preskočeno (odjava)";
  const s = await getSettings();
  await primeCatalog();
  let code = null;
  if (job.kind === "cart2" && s.cart_discount2) code = await personalCode(sql, "KOSARICA", s.cart_discount2, 3, `Zapuščena košarica ${c.email}`);
  const { html, subject } = renderCart(job.kind, c, s, code);
  await send({ to: c.email, subject, html });
  return "poslano";
}

/** Opomnik za košarico (cart1 / cart2; tudi za predogled). */
export function renderCart(kind, c, s, code) {
  const lang = mailLang(c.lang);
  const t = (sl, e, hr) => tx(lang, sl, e, hr);
  const lines = [];
  for (const l of c.cart || []) {
    if (l.bundle) for (const x of l.items || []) lines.push([x.id, x.size, "Paket 3 (−15 %)"]);
    else lines.push([l.id, l.size, l.qty > 1 ? `${l.qty}×` : ""]);
  }
  const rows = lines.map(([id, size, note]) => prodRow(getAnyProduct(id), lang, ` · ${t("vel.", "size", "vel.")} ${esc(size)}${note ? " · " + note : ""}`)).join("");
  const url = `${SITE}/${lang}/kosarica?c=${c.token}`;
  const first = kind === "cart1";
  const html = shell(first ? t("Si kaj pozabil/-a? 👀", "Forgot something? 👀", "Jesi li nešto zaboravio/-la? 👀") : t("Še razmišljaš? 🤔", "Still thinking about it? 🤔", "Još razmišljaš? 🤔"),
    `<p style="font-size:15px;line-height:1.65;margin:0">${first
      ? t("Tvoji izbrani artikli te še čakajo v košarici. Velikosti hitro zmanjka, zato zaključi naročilo, dokler je tvoja še na zalogi.", "Your picks are still waiting in your cart. Sizes sell out fast — finish your order while yours is still in stock.", "Proizvodi koje si odabrao/-la još te čekaju u košarici. Veličine brzo nestanu, zato završi narudžbu dok je tvoja još na zalihi.")
      : t("Košarico smo ti shranili — in da bo odločitev lažja, imamo zate majhno presenečenje.", "We saved your cart — and to make it easier, here's a little something just for you.", "Spremili smo ti košaricu — a da ti odluka bude lakša, imamo za tebe malo iznenađenje.")}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">${rows}</table>
${code ? codeBox(code, s.cart_discount2, t("Velja 3 dni · vpiši jo na blagajni", "Valid for 3 days · enter it at checkout", "Vrijedi 3 dana · upiši ga na blagajni"), lang) : ""}
${button(url, t("Zaključi nakup", "Complete my order", "Završi kupnju"))}
<p style="font-size:13px;color:#666;margin:6px 0 0">${t("Brezplačna dostava nad 50 € · 14 dni za vračilo", "Free shipping over €80 · 14 days to return", "Besplatna dostava iznad 80 € · 14 dana za povrat")}</p>`, unsubFooter(c.email, lang),
    { lang, pre: first ? t("Tvoja košarica te čaka", "Your cart is waiting", "Tvoja košarica te čeka") : t(`V mailu te čaka koda za −${s.cart_discount2} %`, `A −${s.cart_discount2} % code inside`, `U mailu te čeka kod za −${s.cart_discount2} %`) });
  return { html, subject: first ? t("Tvoja košarica te čaka 🛒", "Your cart is waiting 🛒", "Tvoja košarica te čeka 🛒") : code ? t(`−${s.cart_discount2} % za tvojo košarico — samo 3 dni`, `−${s.cart_discount2} % on your cart — 3 days only`, `−${s.cart_discount2} % za tvoju košaricu — samo 3 dana`) : t("Zadnji opomnik za tvojo košarico", "Last call for your cart", "Zadnji podsjetnik za tvoju košaricu") };
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
  if (!n) return { ok: false, message: tx(o.lang, "Te artikle si že ocenil/-a.", "You have already reviewed these items.", "Ove proizvode već si ocijenio/-la.") };
  const s = await getSettings();
  let code = null;
  if (s.review_discount) {
    const [had] = await sql`SELECT code FROM coupons WHERE note = ${"Ocena naročila " + orderId}`;
    code = had?.code || (await personalCode(sql, "HVALA", s.review_discount, 60, "Ocena naročila " + orderId));
  }
  return { ok: true, count: n, code, percent: s.review_discount };
}

/* ---------- kampanje ---------- */
/** Kampanja iz prilepljene HTML kode: {{odjava}} → povezava za odjavo (če je ni, dodamo nogo z odjavo). */
function renderHtmlCampaign(c, email, lang) {
  let h = String(c.html || "").replace(/<script[\s\S]*?<\/script>/gi, "");
  const url = email ? unsubUrl(email, lang) : "#";
  const tok = /\{\{\s*(odjava|unsubscribe|ODJAVA|UNSUBSCRIBE)\s*\}\}/g;
  const had = tok.test(h);
  h = h.replace(tok, url).replace(/\{\{\s*(email|EMAIL)\s*\}\}/g, esc(email || ""));
  if (!/<html[\s>]/i.test(h)) h = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${h}</body></html>`;
  if (c.preheader && !/display:\s*none/i.test(h.slice(0, 3000)))
    h = h.replace(/<body([^>]*)>/i, `<body$1><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>`);
  if (!had) {
    const foot = `<div style="text-align:center;font:12px/1.6 Arial,sans-serif;color:#999;padding:18px 12px">Freestyle Freak d.o.o. · 69slam.si<br><a href="${url}" style="color:#999">${tx(lang, "Odjava od e-mailov", "Unsubscribe", "Odjava od e-mailova")}</a></div>`;
    h = /<\/body>/i.test(h) ? h.replace(/<\/body>/i, `${foot}</body>`) : h + foot;
  }
  return h;
}

export async function renderCampaign(c, { email = "", lang = "sl" } = {}) {
  if (c.html && String(c.html).trim()) return renderHtmlCampaign(c, email, lang);
  await primeCatalog();
  const parts = [];
  for (const b of c.blocks || []) {
    if (b.type === "heading") parts.push(`<h2 style="font-size:22px;font-weight:900;text-transform:uppercase;margin:22px 0 8px">${esc(b.text)}</h2>`);
    else if (b.type === "text") parts.push(`<p style="font-size:15px;line-height:1.65;margin:0 0 14px">${esc(b.text).replace(/\n/g, "<br>")}</p>`);
    else if (b.type === "image" && b.url) parts.push(`<p style="margin:0 0 14px">${b.link ? `<a href="${esc(b.link)}">` : ""}<img src="${esc(b.url)}" width="544" style="width:100%;max-width:544px;border-radius:12px;display:block" alt="">${b.link ? "</a>" : ""}</p>`);
    else if (b.type === "button" && b.url) parts.push(button(esc(b.url), esc(b.text || tx(lang, "Poglej", "View", "Pogledaj"))));
    else if (b.type === "products") {
      const ps = (b.codes || []).map((code) => getAnyProduct(code)).filter(Boolean);
      const cells = ps.map((p) => {
        const url = `${SITE}/${lang}/p/${p.slug}`;
        const omni = `<div style="font-size:10.5px;color:#888;margin-top:2px">${tx(lang, "Najnižja cena v zadnjih 30 dneh", "Lowest price in the last 30 days", "Najniža cijena u zadnjih 30 dana")}: ${eur((p.low30 ?? p.price) * 100)}</div>`;
        const price = (p.effPrice < p.price ? `<s style="color:#999">${eur(p.price * 100)}</s> <b style="color:#e63946">${eur(p.effPrice * 100)}</b>` : `<b>${eur(p.price * 100)}</b>`) + omni;
        return `<td width="50%" valign="top" style="padding:6px"><a href="${url}" style="text-decoration:none;color:#0a0a0a">
<img src="${esc(p.img || "")}" width="260" style="width:100%;border-radius:10px;display:block;aspect-ratio:4/5;object-fit:cover" alt="">
<div style="font-weight:800;text-transform:uppercase;font-size:13px;margin-top:8px">${esc(p.name)}</div>
<div style="font-size:14px;margin-top:2px">${price}</div>
<div style="margin-top:8px;display:inline-block;background:#0a0a0a;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:800;text-transform:uppercase">${tx(lang, "Kupi", "Shop", "Kupi")}</div></a></td>`;
      });
      let rows = "";
      for (let i = 0; i < cells.length; i += 2) rows += `<tr>${cells[i]}${cells[i + 1] || '<td width="50%"></td>'}</tr>`;
      parts.push(`<table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px">${rows}</table>`);
    }
  }
  return shell(esc(c.title || ""), parts.join(""), email ? unsubFooter(email, lang) : "", { lang, pre: c.preheader || "" });
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

/** Cron: načrtovane kampanje, ki jim je napočil čas, in nedokončana pošiljanja. */
export async function processCampaigns(max = 400) {
  const sql = db();
  const [c] = await sql`SELECT id FROM campaigns WHERE (status = 'načrtovano' AND scheduled_at <= now()) OR status = 'v pošiljanju'
    ORDER BY scheduled_at NULLS LAST, id LIMIT 1`;
  if (!c) return null;
  const r = await sendCampaign(c.id, max);
  return { id: Number(c.id), ...r };
}
