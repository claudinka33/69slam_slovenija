#!/usr/bin/env node
/**
 * Prenese vse slike izdelkov s Shopify CDN v public/img/products.
 * Zaženi NA SVOJEM RAČUNALNIKU (v mapi projekta):  npm run slike
 * Nato v Vercel nastavi NEXT_PUBLIC_LOCAL_IMAGES=1 in commitaj slike
 * (v .gitignore odstrani vrstico public/img/products/*.jpg).
 * POMEMBNO: zaženi, dokler je Shopify trgovina še aktivna.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("public/img/products");
fs.mkdirSync(OUT, { recursive: true });

const rows = fs.readFileSync("data/images-manifest.csv", "utf8")
  .trim().split("\n").slice(1)
  .map((l) => {
    const [code, file, ...rest] = l.split(",");
    return { code, file, url: rest.join(",") };
  });

let ok = 0;
const fail = [];
for (const r of rows) {
  const dest = path.join(OUT, r.file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) { ok++; continue; }
  try {
    const sep = r.url.includes("?") ? "&" : "?";
    const res = await fetch(r.url + sep + "width=1600");
    if (!res.ok) throw new Error("HTTP " + res.status);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    ok++;
    process.stdout.write(`\r${ok}/${rows.length} ${r.file}   `);
  } catch (e) {
    fail.push({ file: r.file, err: String(e) });
  }
}
console.log(`\nPreneseno: ${ok}/${rows.length}`);
if (fail.length) {
  console.log("NEUSPEŠNO:", fail);
  process.exitCode = 1;
}
