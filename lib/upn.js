import QRCode from "qrcode";
import { COMPANY } from "./legal";

// Slovenski UPN QR (standard ZBS »UPN QR«): 19 polj, vsako zaključeno z \n, + kontrolna vsota (dolžina).
// Kodiranje ISO-8859-2, QR verzija 15, popravljanje napak M.
const L2 = { "Č": 0xc8, "č": 0xe8, "Š": 0xa9, "š": 0xb9, "Ž": 0xae, "ž": 0xbe, "Ć": 0xc6, "ć": 0xe6, "Đ": 0xd0, "đ": 0xf0 };
function latin2(str) {
  const out = [];
  for (const ch of str) {
    if (L2[ch] != null) out.push(L2[ch]);
    else {
      const c = ch.normalize("NFD").replace(/[̀-ͯ]/g, "").charCodeAt(0);
      out.push(c < 256 ? c : 0x3f);
    }
  }
  return Uint8Array.from(out);
}
const cut = (s, n) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, n);

/** Besedilo UPN QR za plačilo naročila. */
export function upnText({ amountCents, number, name, street, city, purpose, dueDate, ref: refIn }) {
  const ref = refIn || `SI00${String(number).replace(/\D/g, "")}`;
  const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 5 * 864e5);
  const dd = `${String(due.getDate()).padStart(2, "0")}.${String(due.getMonth() + 1).padStart(2, "0")}.${due.getFullYear()}`;
  const [cStreet, cCity] = [COMPANY.street, COMPANY.city];
  const f = [
    "UPNQR", "", "", "", "",
    cut(name, 33), cut(street, 33), cut(city, 33),
    String(Math.round(amountCents)).padStart(11, "0"),
    "", "", "OTHR",
    cut(purpose || `Placilo narocila ${number}`, 42),
    dd,
    COMPANY.iban.replace(/\s/g, ""),
    ref,
    cut("Freestyle Freak d.o.o.", 33), cut(cStreet, 33), cut(cCity, 33),
  ];
  const body = f.map((x) => x + "\n").join("");
  const sum = String(latin2(body).length).padStart(3, "0");
  return { text: body + sum + "\n", ref, due: dd };
}

/** SVG z UPN QR kodo. */
export async function upnSvg(opts) {
  const { text, ref, due } = upnText(opts);
  const svg = await QRCode.toString([{ data: latin2(text), mode: "byte" }], {
    type: "svg", errorCorrectionLevel: "M", version: 15, margin: 2,
  });
  return { svg, ref, due };
}

/** PNG z UPN QR kodo (za PDF dokumente). */
export async function upnPng(opts) {
  const { text, ref, due } = upnText(opts);
  const png = await QRCode.toBuffer([{ data: latin2(text), mode: "byte" }], { errorCorrectionLevel: "M", version: 15, margin: 1, scale: 4 });
  return { png, ref, due };
}
