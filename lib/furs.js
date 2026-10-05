import crypto from "node:crypto";
import forge from "node-forge";
import { db } from "./db";

/* =====================================================================
 * Davčno potrjevanje (FURS) — hramba namenskega digitalnega potrdila.
 * Datoteka .p12 in geslo sta v bazi ŠIFRIRANA (AES-256-GCM); ključ je izpeljan iz
 * skrivnosti na strežniku (FURS_SECRET ali ADMIN_PASSWORD) in ni nikoli v bazi.
 * ===================================================================== */

export const FURS_DEFAULTS = {
  enabled: false,   // potrjevanje vklopljeno
  mode: "vse",      // "vse" (kot v Metakocki) | "gotovina" (kartica, gotovina, povzetje) | "kartica"
  premise: "",      // oznaka poslovnega prostora (npr. SPLET)
  device: "1",      // oznaka elektronske naprave
};

function key() {
  const s = process.env.FURS_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("Na strežniku manjka skrivnost za šifriranje (ADMIN_PASSWORD).");
  return crypto.createHash("sha256").update(`${s}::69slam-furs-cert`).digest();
}
function enc(buf) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const out = Buffer.concat([c.update(buf), c.final()]);
  return [iv, c.getAuthTag(), out].map((b) => b.toString("base64")).join(".");
}
function dec(s) {
  const [iv, tag, data] = String(s).split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]);
}

/** Prebere .p12 in vrne podatke o potrdilu (preveri tudi geslo). */
export function readP12(buf, password) {
  let p12;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(buf.toString("binary")));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  } catch (e) {
    const m = String(e?.message || e);
    throw new Error(/mac|password|invalid/i.test(m) ? "Geslo ne ustreza tej datoteki (.p12)." : "To ni veljavna datoteka .p12.");
  }
  const certs = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keys = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [])
    .concat(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []);
  if (!keys.length) throw new Error("V datoteki ni zasebnega ključa — prenesi potrdilo znova.");
  // potrdilo uporabnika = tisto, ki ni izdajatelj (CA)
  const cert = (certs.find((b) => !b.cert.extensions?.some((x) => x.name === "basicConstraints" && x.cA)) || certs[0])?.cert;
  if (!cert) throw new Error("V datoteki ni potrdila.");
  const dn = (attrs) => attrs.map((a) => `${a.shortName || a.name}=${a.value}`).join(",");
  return {
    subject: dn(cert.subject.attributes), issuer: dn(cert.issuer.attributes),
    cn: cert.subject.getField("CN")?.value || "", serial: BigInt(`0x${cert.serialNumber}`).toString(),
    valid_from: cert.validity.notBefore.toISOString(), valid_to: cert.validity.notAfter.toISOString(),
  };
}

export async function getFurs() {
  const rows = await db()`SELECT key, value FROM settings WHERE key IN ('furs', 'furs_cert')`;
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { settings: { ...FURS_DEFAULTS, ...(m.furs || {}) }, cert: m.furs_cert ? { ...m.furs_cert.info, uploaded_at: m.furs_cert.uploaded_at, file: m.furs_cert.file } : null };
}

export async function saveFursSettings(v) {
  const cur = (await getFurs()).settings;
  const clean = { ...cur };
  if (v.mode && ["vse", "gotovina", "kartica"].includes(v.mode)) clean.mode = v.mode;
  if (v.premise !== undefined) clean.premise = String(v.premise).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (v.device !== undefined) clean.device = String(v.device).replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "1";
  await db()`INSERT INTO settings (key, value) VALUES ('furs', ${JSON.stringify(clean)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  return clean;
}

export async function saveCert(buf, password, filename) {
  const info = readP12(buf, password);
  if (new Date(info.valid_to) < new Date()) throw new Error("To potrdilo je že poteklo.");
  const value = { info, file: String(filename || "potrdilo.p12").slice(0, 120), uploaded_at: new Date().toISOString(), p12: enc(buf), pass: enc(Buffer.from(password, "utf8")) };
  await db()`INSERT INTO settings (key, value) VALUES ('furs_cert', ${JSON.stringify(value)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  return info;
}

export async function removeCert() {
  await db()`DELETE FROM settings WHERE key = 'furs_cert'`;
}

/** Za potrjevanje (kasneje): { p12: Buffer, password } */
export async function loadCert() {
  const [r] = await db()`SELECT value FROM settings WHERE key = 'furs_cert'`;
  if (!r) return null;
  return { p12: dec(r.value.p12), password: dec(r.value.pass).toString("utf8"), info: r.value.info };
}
