/**
 * Prepozna zatipkane e-mail domene (npr. paola@ail.com → paola@gmail.com).
 * Vrne predlog popravljenega naslova ali null, če je naslov videti v redu.
 */
const DOMAINS = [
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "icloud.com", "me.com",
  "msn.com", "aol.com", "gmx.net", "gmx.at", "gmx.de", "web.de", "proton.me", "protonmail.com",
  "siol.net", "t-2.net", "t-2.si", "amis.net", "telemach.net", "guest.arnes.si", "arnes.si", "triera.net", "volja.net", "email.si", "najdi.si",
  "hotmail.si", "yahoo.si", "net.hr", "t-com.hr", "hi.t-com.hr", "inet.hr", "yahoo.co.uk", "hotmail.co.uk", "hotmail.it", "libero.it",
];
// pogoste zatipkane domene → pravilna
const FIX = {
  "ail.com": "gmail.com", "gail.com": "gmail.com", "gmal.com": "gmail.com", "gmial.com": "gmail.com", "gmaill.com": "gmail.com",
  "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com", "gmail.om": "gmail.com", "gmail.si": "gmail.com", "gmail.hr": "gmail.com", "gmail.c": "gmail.com",
  "gmail.comm": "gmail.com", "gmail.cmo": "gmail.com", "gmail.ocm": "gmail.com", "gmali.com": "gmail.com", "gimail.com": "gmail.com",
  "g-mail.com": "gmail.com", "gmail.coom": "gmail.com", "gmeil.com": "gmail.com", "mail.com": null,
  "hotmal.com": "hotmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmail.con": "hotmail.com",
  "hormail.com": "hotmail.com", "homail.com": "hotmail.com", "otmail.com": "hotmail.com",
  "outlok.com": "outlook.com", "outllok.com": "outlook.com", "outlook.co": "outlook.com", "outlook.con": "outlook.com", "otlook.com": "outlook.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yahoo.con": "yahoo.com",
  "icloud.co": "icloud.com", "iclod.com": "icloud.com", "icoud.com": "icloud.com", "icluod.com": "icloud.com", "icloud.con": "icloud.com",
  "siol.com": "siol.net", "siol.ne": "siol.net", "siol.nett": "siol.net", "sio.net": "siol.net", "t-2.com": "t-2.net", "t2.net": "t-2.net",
};
const TLD_FIX = { con: "com", cpm: "com", vom: "com", xom: "com", cim: "com", comm: "com", cm: "com", om: "com", nett: "net", ner: "net" };

function dist(a, b) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[m][n];
}

export function emailSuggestion(raw) {
  const email = String(raw || "").trim().toLowerCase().replace(/\s+/g, "");
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const user = email.slice(0, at);
  let dom = email.slice(at + 1).replace(/,/g, ".").replace(/\.+$/, "");
  if (!dom) return null;
  if (DOMAINS.includes(dom)) return null;
  if (dom in FIX) return FIX[dom] ? `${user}@${FIX[dom]}` : null;
  // napačna končnica (.con, .cm …)
  const p = dom.lastIndexOf(".");
  if (p > 0 && TLD_FIX[dom.slice(p + 1)]) {
    const fixed = dom.slice(0, p + 1) + TLD_FIX[dom.slice(p + 1)];
    if (DOMAINS.includes(fixed)) return `${user}@${fixed}`;
  }
  if (!dom.includes(".")) {
    const g = DOMAINS.find((d) => d.split(".")[0] === dom);
    if (g) return `${user}@${g}`;
  }
  // najbližja znana domena (1–2 črki razlike)
  let best = null, bd = 9;
  for (const d of DOMAINS) {
    const k = dist(dom, d);
    if (k < bd) { bd = k; best = d; }
  }
  const limit = dom.length <= 8 ? 1 : 2;
  return best && bd <= limit ? `${user}@${best}` : null;
}

export const emailLooksValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());
