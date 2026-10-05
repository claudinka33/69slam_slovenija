import crypto from "node:crypto";
import forge from "node-forge";
import https from "node:https";
import http from "node:http";
import tls from "node:tls";
import { db } from "./db";
import { COMPANY } from "./legal";

/* =====================================================================
 * Davčno potrjevanje (FURS) — hramba namenskega digitalnega potrdila.
 * Datoteka .p12 in geslo sta v bazi ŠIFRIRANA (AES-256-GCM); ključ je izpeljan iz
 * skrivnosti na strežniku (FURS_SECRET ali ADMIN_PASSWORD) in ni nikoli v bazi.
 * ===================================================================== */

export const FURS_DEFAULTS = {
  enabled: false,        // potrjevanje vklopljeno (samodejno ob prijavi poslovnega prostora)
  mode: "vse",           // "vse" (kot v Metakocki) | "gotovina" (kartica, gotovina, povzetje) | "kartica"
  premise: "69SLAM",     // oznaka poslovnega prostora (spletna trgovina, tip C) — ločena od Metakocke (»Slam«)
  dev_racun: "R",        // oznaka elektronske naprave za račune  → 69SLAM-R-1, 69SLAM-R-2 …
  dev_dobropis: "D",     // oznaka za dobropise                   → 69SLAM-D-1 …
  operator: "",          // osebna davčna številka izdajatelja (neobvezno, za ročne račune)
  registered_at: null,   // kdaj je bil poslovni prostor prijavljen
  validity: null,        // datum veljavnosti prijave
};

/** Ali se račun s tem načinom plačila potrjuje. */
export function fursApplies(s, payment) {
  if (!s?.enabled || !s?.registered_at) return false;
  if (s.mode === "gotovina") return ["kartica", "gotovina", "povzetje"].includes(payment);
  if (s.mode === "kartica") return ["kartica", "gotovina"].includes(payment);
  return true;
}

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
  const id = (x, d) => String(x).replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || d;
  // oznak po prijavi ne spreminjamo (številčenje mora ostati neprekinjeno)
  if (!cur.registered_at) {
    if (v.premise !== undefined) clean.premise = id(v.premise, "69SLAM");
    if (v.dev_racun !== undefined) clean.dev_racun = id(v.dev_racun, "R");
    if (v.dev_dobropis !== undefined) clean.dev_dobropis = id(v.dev_dobropis, "D");
  }
  if (v.operator !== undefined) clean.operator = String(v.operator).replace(/\D/g, "").slice(0, 8);
  if (v.enabled !== undefined && cur.registered_at) clean.enabled = !!v.enabled;
  if (v._registered) { clean.registered_at = v._registered; clean.validity = v._validity; clean.enabled = true; }
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

/* =====================================================================
 * Povezava s FURS (JSON + JWS RS256, TLS z namenskim potrdilom).
 * ===================================================================== */

export const FURS_HOST = { prod: "blagajne.fu.gov.si", prodPort: 9003, test: "blagajne-test.fu.gov.si", testPort: 9002 };
export const TAX_NUMBER = Number(String(COMPANY.vat).replace(/\D/g, ""));

/** Ključ in podatki potrdila za podpisovanje. */
async function signer() {
  const c = await loadCert();
  if (!c) throw new Error("Potrdilo ni naloženo (Oblika → Davčno potrjevanje).");
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(c.p12.toString("binary")));
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, c.password);
  const kb = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [])
    .concat(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []);
  const certs = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const cert = (certs.find((b) => !b.cert.extensions?.some((x) => x.name === "basicConstraints" && x.cA)) || certs[0]).cert;
  const keyPem = forge.pki.privateKeyToPem(kb[0].key);
  const certPem = forge.pki.certificateToPem(cert);
  const chainPem = certs.map((b) => forge.pki.certificateToPem(b.cert)).join("");
  // RFC 4514 (obraten vrstni red, kot ga pričakuje FURS)
  const SN = { serialName: "serialNumber", countryName: "C", organizationName: "O", organizationalUnitName: "OU", commonName: "CN", localityName: "L", stateOrProvinceName: "ST", givenName: "GN", surname: "SN" };
  const esc4514 = (v) => String(v).replace(/([,+"\\<>;])/g, "\\$1");
  const dn = (attrs) => attrs.slice().reverse().map((a) => `${SN[a.name] || a.shortName || a.type}=${esc4514(a.value)}`).join(",");
  return { keyPem, certPem, chainPem, subject: dn(cert.subject.attributes), issuer: dn(cert.issuer.attributes), serial: BigInt(`0x${cert.serialNumber}`).toString() };
}

const b64u = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function jws(s, payload) {
  // serial je lahko večji od varnega celega števila v JS → glavo sestavimo ročno (število brez narekovajev)
  const header = `{"alg":"RS256","subject_name":${JSON.stringify(s.subject)},"issuer_name":${JSON.stringify(s.issuer)},"serial":${s.serial}}`;
  const input = `${b64u(header)}.${b64u(JSON.stringify(payload))}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(input), s.keyPem);
  return `${input}.${b64u(sig)}`;
}

function decodeJws(token) {
  const p = String(token || "").split(".")[1];
  if (!p) return null;
  return JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

/* Korensko potrdilo države (SI-TRUST Root), ki ga podpisuje strežnik FURS (preko SIGOV-CA).
 * Ni v privzetem seznamu Node.js, zato verigo preverimo sami in korensko potrdilo »pripnemo«. */
const SI_TRUST_ROOT_FP = "FA:D5:40:81:1A:FA:E0:DC:76:7C:DF:65:72:A0:88:FA:3C:E8:49:3D:D8:2B:3B:86:9A:67:D1:0A:AB:4E:81:24";

/* ---------- posrednik v Sloveniji (FURS sprejema samo slovenske IP) ---------- */
export function parseProxy(str) {
  const m = String(str || "").trim().match(/^furs:\/\/([a-f0-9]{32,128})@([a-z0-9.\-]+):(\d{2,5})$/i);
  if (!m) throw new Error("Napačen zapis posrednika — kopiraj celo vrstico »furs://…« iz strežnika.");
  return { token: m[1], host: m[2], port: Number(m[3]) };
}
export async function saveProxy(str) {
  const p = parseProxy(str);
  const value = { host: p.host, port: p.port, token: enc(Buffer.from(p.token)), saved_at: new Date().toISOString() };
  await db()`INSERT INTO settings (key, value) VALUES ('furs_proxy', ${JSON.stringify(value)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  return { host: p.host, port: p.port };
}
export async function removeProxy() { await db()`DELETE FROM settings WHERE key = 'furs_proxy'`; }
export async function proxyInfo() {
  const [r] = await db()`SELECT value FROM settings WHERE key = 'furs_proxy'`;
  return r ? { host: r.value.host, port: r.value.port, saved_at: r.value.saved_at } : null;
}
async function loadProxy() {
  const [r] = await db()`SELECT value FROM settings WHERE key = 'furs_proxy'`;
  return r ? { host: r.value.host, port: r.value.port, token: dec(r.value.token).toString() } : null;
}

/** Odpre TCP povezavo do FURS — neposredno ali skozi posrednika (HTTP CONNECT). */
function openTunnel(proxy, host, port, timeout) {
  if (!proxy) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: proxy.host, port: proxy.port, method: "CONNECT", path: `${host}:${port}`, timeout,
      headers: { "Proxy-Authorization": `Bearer ${proxy.token}`, Host: `${host}:${port}` } });
    req.on("connect", (res, socket) => {
      if (res.statusCode !== 200) { socket.destroy(); reject(new Error(`Posrednik je zavrnil povezavo (${res.statusCode}).`)); return; }
      resolve(socket);
    });
    req.on("timeout", () => req.destroy(new Error("Posrednik v Sloveniji se ne odziva.")));
    req.on("error", (e) => reject(new Error(`Posrednik v Sloveniji ni dosegljiv: ${e.message}`)));
    req.end();
  });
}

/** POST na FURS. Vrne { status, json } ali vrže napako (omrežje). */
async function furPost(s, path, body, { test = false, timeout = 12000 } = {}) {
  const host = test ? FURS_HOST.test : FURS_HOST.prod;
  const port = test ? FURS_HOST.testPort : FURS_HOST.prodPort;
  const data = Buffer.from(JSON.stringify(body));
  const proxy = await loadProxy();
  const raw = await openTunnel(proxy, host, port, timeout);
  // TLS (z našim potrdilom) — skozi tunel gre šifrirano od konca do konca, posrednik vsebine ne vidi
  const sock = await new Promise((resolve, reject) => {
    const t = tls.connect({ ...(raw ? { socket: raw } : { host, port }), servername: host, key: s.keyPem, cert: s.certPem, rejectUnauthorized: false, timeout }, () => resolve(t));
    t.on("error", (e) => reject(new Error(`Povezava s FURS ni uspela: ${e.message}`)));
    t.on("timeout", () => t.destroy(new Error("FURS se ne odziva (časovna omejitev).")));
  });
  const peer = sock.getPeerCertificate(true);
  const chain = [];
  for (let c = peer, i = 0; c && c.fingerprint256 && i < 6; i++) { chain.push({ cn: c.subject?.CN, issuer: c.issuer?.CN, fp: c.fingerprint256 }); if (c.issuerCertificate === c) break; c = c.issuerCertificate; }
  if (!test) {
    const rootOk = chain.length && chain[chain.length - 1].fp === SI_TRUST_ROOT_FP;
    const chainOk = sock.authorized || String(sock.authorizationError) === "SELF_SIGNED_CERT_IN_CHAIN";
    const nameErr = tls.checkServerIdentity(host, peer);
    if (!rootOk || !chainOk || nameErr) { sock.destroy(); throw new Error("Strežnik se ni predstavil s pravim državnim potrdilom (FURS) — povezava prekinjena."); }
  }
  return new Promise((resolve, reject) => {
    // HTTP čez že preverjeno TLS povezavo
    const req = http.request({ host, port, path, method: "POST", agent: false, createConnection: () => sock, timeout,
      headers: { "Content-Type": "application/json; charset=UTF-8", "Content-Length": data.length } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null; try { json = JSON.parse(text); } catch {}
        if (/Request Rejected/i.test(text)) { const e = new Error(proxy ? "FURS je zavrnil IP posrednika — ni slovenski." : "FURS sprejema samo zahteve iz Slovenije — nastavi posrednika (strežnik v SLO)."); reject(e); return; }
        resolve({ status: res.statusCode, json, text: text.slice(0, 500), chain, via: proxy ? `${proxy.host}:${proxy.port}` : "neposredno" });
      });
    });
    req.on("timeout", () => req.destroy(new Error("FURS se ne odziva (časovna omejitev).")));
    req.on("error", reject);
    req.end(data);
  });
}

/** Lokalni čas Ljubljana: { iso: 2026-10-05T10:15:30, zoi: 05.10.2026 10:15:30, qr: 261005101530 } */
export function ljTime(d) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Ljubljana", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(d)).map((p) => [p.type, p.value]));
  const { year: y, month: m, day: dd, hour: h, minute: mi, second: s } = parts;
  return { iso: `${y}-${m}-${dd}T${h}:${mi}:${s}`, zoi: `${dd}.${m}.${y} ${h}:${mi}:${s}`, qr: `${y.slice(2)}${m}${dd}${h}${mi}${s}`, date: `${y}-${m}-${dd}` };
}

/** ZOI = MD5(RSA-SHA256 podpis(davčna + datum/čas + št. računa + posl. prostor + naprava + znesek)) */
export function zoiOf(keyPem, { issuedAt, number, premise, device, amount }) {
  const t = ljTime(issuedAt);
  const content = `${TAX_NUMBER}${t.zoi}${number}${premise}${device}${Number(amount).toFixed(2)}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(content, "utf8"), keyPem);
  return crypto.createHash("md5").update(sig).digest("hex");
}

/** 60-mestna koda za QR (ZOI desetiško 39 + davčna 8 + datum/čas 12 + kontrolna 1). */
export function qrData(zoi, issuedAt) {
  const dec = BigInt(`0x${zoi}`).toString().padStart(39, "0");
  const base = `${dec}${String(TAX_NUMBER).padStart(8, "0")}${ljTime(issuedAt).qr}`;
  const ctrl = [...base].reduce((a, c) => a + Number(c), 0) % 10;
  return `${base}${ctrl}`;
}

const header = () => ({ MessageID: crypto.randomUUID(), DateTime: ljTime(new Date()).iso });

/** Test povezave (echo) — ne pošlje nobenih podatkov. */
export async function fursEcho({ test = false } = {}) {
  const s = await signer();
  const r = await furPost(s, "/v1/cash_registers/echo", { EchoRequest: "69slam" }, { test });
  return { ok: r.status === 200 && JSON.stringify(r.json || r.text).includes("69slam"), status: r.status, body: r.json || r.text, chain: r.chain, via: r.via };
}

/** Prijava poslovnega prostora (spletna trgovina = tip C, posamezna elektronska naprava). */
export async function registerPremise({ premise, validity, close = false, test = false }) {
  const s = await signer();
  const payload = { BusinessPremiseRequest: { Header: header(), BusinessPremise: {
    TaxNumber: TAX_NUMBER, BusinessPremiseID: premise, BPIdentifier: { PremiseType: "C" },
    ValidityDate: validity, SoftwareSupplier: [{ TaxNumber: TAX_NUMBER }], SpecialNotes: "Spletna trgovina 69slam.si",
    ...(close ? { ClosingTag: "Z" } : {}) } } };
  const r = await furPost(s, "/v1/cash_registers/invoices/register", { token: jws(s, payload) }, { test });
  const res = decodeJws(r.json?.token) || r.json;
  const err = res?.BusinessPremiseResponse?.Error;
  if (r.status !== 200 || err || !res?.BusinessPremiseResponse) throw new Error(err ? `FURS ${err.ErrorCode}: ${err.ErrorMessage}` : `FURS odgovor ${r.status}: ${r.text}`);
  return res.BusinessPremiseResponse;
}

/** Potrdi račun. inv: vrstica iz invoices. Vrne { zoi, eor } ali vrže napako ({ network: true } pri izpadu). */
export async function fiscalizeInvoice(inv, { subsequent = false, operator = null, ref = null } = {}) {
  const s = await signer();
  const { computeInvoice } = await import("./invoices");
  const calc = computeInvoice(inv.items, inv.prices_gross);
  const amount = Math.round(calc.total) / 100;
  const ids = { premise: inv.furs_premise, device: inv.furs_device, number: String(inv.furs_seq) };
  const zoi = inv.zoi || zoiOf(s.keyPem, { issuedAt: inv.issued_at, number: ids.number, premise: ids.premise, device: ids.device, amount });
  const vat = calc.groups.filter((g) => g.rate > 0).map((g) => ({ TaxRate: Number(g.rate.toFixed(2)), TaxableAmount: g.base / 100, TaxAmount: g.vat / 100 }));
  const exempt = calc.groups.filter((g) => !g.rate).reduce((a, g) => a + g.base, 0);
  const tps = { ...(vat.length ? { VAT: vat } : {}), ...(exempt ? { ExemptVATTaxableAmount: exempt / 100 } : {}) };
  const invoice = {
    TaxNumber: TAX_NUMBER, IssueDateTime: ljTime(inv.issued_at).iso, NumberingStructure: "B",
    InvoiceIdentifier: { BusinessPremiseID: ids.premise, ElectronicDeviceID: ids.device, InvoiceNumber: ids.number },
    InvoiceAmount: amount, PaymentAmount: amount, TaxesPerSeller: [tps], ProtectedID: zoi,
    ...(inv.customer_vat && /^SI\d{8}$/i.test(inv.customer_vat.replace(/\s/g, "")) ? { CustomerVATNumber: inv.customer_vat.replace(/\D/g, "") } : {}),
    ...(operator ? { OperatorTaxNumber: Number(operator) } : {}),
    ...(subsequent ? { SubsequentSubmit: true } : {}),
    ...(ref ? { ReferenceInvoice: [{ ReferenceInvoiceIdentifier: { BusinessPremiseID: ref.premise, ElectronicDeviceID: ref.device, InvoiceNumber: String(ref.seq) }, ReferenceInvoiceIssueDateTime: ljTime(ref.issued_at).iso }] } : {}),
  };
  let r;
  try { r = await furPost(s, "/v1/cash_registers/invoices", { token: jws(s, { InvoiceRequest: { Header: header(), Invoice: invoice } }) }); }
  catch (e) { const x = new Error(String(e?.message || e)); x.network = true; x.zoi = zoi; throw x; }
  const res = decodeJws(r.json?.token) || r.json;
  const err = res?.InvoiceResponse?.Error;
  const eor = res?.InvoiceResponse?.UniqueInvoiceID;
  if (r.status >= 500) { const x = new Error(`FURS ni dosegljiv (${r.status})`); x.network = true; x.zoi = zoi; throw x; }
  if (err || !eor) { const x = new Error(err ? `FURS ${err.ErrorCode}: ${err.ErrorMessage}` : `FURS odgovor ${r.status}: ${r.text}`); x.zoi = zoi; throw x; }
  return { zoi, eor };
}


/* ---------- potrjevanje izdanih računov (zapis v bazo) ---------- */
/** Potrdi račun in zapiše ZOI/EOR. Nikoli ne vrže napake — stanje je v furs_status. */
export async function fiscalizeStored(invId, { subsequent = false } = {}) {
  const sql = db();
  const [inv] = await sql`SELECT * FROM invoices WHERE id = ${invId}`;
  if (!inv || !inv.furs_premise || inv.eor) return inv;
  const { settings } = await getFurs();
  let ref = null;
  if (inv.kind === "dobropis" && inv.source_id) {
    const [src] = await sql`SELECT furs_premise AS premise, furs_device AS device, furs_seq AS seq, issued_at FROM invoices WHERE id = ${inv.source_id} AND eor IS NOT NULL`;
    if (src) ref = src;
  }
  try {
    const r = await fiscalizeInvoice(inv, { subsequent, operator: !inv.order_id && settings.operator ? settings.operator : null, ref });
    const [u] = await sql`UPDATE invoices SET zoi = ${r.zoi}, eor = ${r.eor}, furs_status = 'potrjen', furs_error = NULL, furs_at = now() WHERE id = ${inv.id} RETURNING *`;
    return u;
  } catch (e) {
    const status = e.network ? "caka" : "napaka";
    const [u] = await sql`UPDATE invoices SET zoi = COALESCE(${e.zoi || null}, zoi), furs_status = ${status}, furs_error = ${String(e.message || e).slice(0, 400)} WHERE id = ${inv.id} RETURNING *`;
    return u;
  }
}

/** Naknadno potrjevanje (cron): računi, ki čakajo (izpad povezave) — zakonski rok 2 delovna dneva. */
export async function fursRetry(limit = 20) {
  const rows = await db()`SELECT id FROM invoices WHERE furs_status = 'caka' AND eor IS NULL ORDER BY id LIMIT ${limit}`;
  let ok = 0;
  for (const r of rows) { const u = await fiscalizeStored(r.id, { subsequent: true }); if (u?.eor) ok++; }
  return { pending: rows.length, confirmed: ok };
}
