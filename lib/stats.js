import crypto from "node:crypto";
import { db, ensureSchema } from "./db";

/**
 * Lastna statistika obiska — brez piškotkov in brez osebnih podatkov.
 * Obiskovalca prepoznamo samo znotraj enega dneva z enosmernim odtisom (IP + brskalnik + dnevna sol).
 * IP-ja in brskalnika ne shranjujemo; naslednji dan je odtis drugačen.
 */

const TZ = "Europe/Ljubljana";
export const KINDS = ["view", "product", "cart", "checkout", "purchase"];

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|preview|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch|vercel/i;

function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
}

function salt() {
  const base = process.env.STATS_SALT || process.env.DATABASE_URL || process.env.POSTGRES_URL || "69slam";
  return crypto.createHash("sha256").update(base).digest("hex");
}

export function visitorId(req) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  return crypto.createHash("sha256").update(`${salt()}|${today()}|${ip}|${ua}`).digest("hex").slice(0, 20);
}

export function isBot(req) {
  const ua = req.headers.get("user-agent") || "";
  return !ua || BOT.test(ua);
}

function deviceOf(ua) {
  if (/ipad|tablet/i.test(ua)) return "Tablica";
  if (/mobi|iphone|android/i.test(ua)) return "Mobilni";
  return "Računalnik";
}

const NAMES = [
  [/google/, "Google"],
  [/bing/, "Bing"],
  [/(^|\.)fb\.|facebook/, "Facebook"],
  [/instagram/, "Instagram"],
  [/tiktok/, "TikTok"],
  [/youtube|youtu\.be/, "YouTube"],
  [/pinterest/, "Pinterest"],
  [/chatgpt|openai/, "ChatGPT"],
  [/claude\.ai|perplexity/, "AI iskalnik"],
  [/mail\.|gmail|outlook|webmail/, "E-pošta"],
];

/** Vir obiska iz UTM parametrov ali reference. Vrne null za notranje klike. */
export function sourceOf(referrer, search, host) {
  let q;
  try { q = new URLSearchParams(search || ""); } catch { q = new URLSearchParams(); }
  const utm = (q.get("utm_source") || "").trim().toLowerCase();
  const medium = (q.get("utm_medium") || "").toLowerCase();
  const paid = q.has("gclid") || /cpc|ppc|paid|(^|[_-])ads?$/.test(medium);
  let name = "";
  if (utm) {
    const hit = NAMES.find(([re]) => re.test(utm));
    name = hit ? hit[1] : utm === "ig" ? "Instagram" : /mail|newsletter|klaviyo|resend/.test(utm) ? "E-pošta" : utm.slice(0, 40);
  } else if (q.has("gclid")) {
    name = "Google";
  } else if (q.has("fbclid")) {
    name = /instagram/i.test(referrer || "") ? "Instagram" : "Facebook";
  } else if (referrer) {
    let h = "";
    try { h = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase(); } catch {}
    if (!h) return "Direktno";
    const own = String(host || "").replace(/^www\./, "").toLowerCase();
    if (own && (h === own || h.endsWith("." + own) || h.endsWith(".vercel.app"))) return null;
    const hit = NAMES.find(([re]) => re.test(h));
    name = hit ? hit[1] : h.slice(0, 60);
  } else {
    return "Direktno";
  }
  return paid ? `${name} (oglas)` : name;
}

const clip = (s, n) => (typeof s === "string" && s ? s.slice(0, n) : null);

/** Zapiše en dogodek. Napake tiho požre — statistika ne sme nikoli zlomiti trgovine. */
export async function recordEvent(req, ev) {
  try {
    if (!KINDS.includes(ev.kind) || isBot(req)) return;
    await ensureSchema();
    const sql = db();
    await sql`INSERT INTO stat_events (vid, kind, path, source, campaign, device, item, value_cents)
      VALUES (${visitorId(req)}, ${ev.kind}, ${clip(ev.path, 300)}, ${clip(ev.source, 80)}, ${clip(ev.campaign, 80)},
        ${deviceOf(req.headers.get("user-agent") || "")}, ${clip(ev.item, 120)},
        ${Number.isFinite(ev.value_cents) ? Math.round(ev.value_cents) : null})`;
  } catch (e) {
    console.error("[stats]", e?.message);
  }
}
