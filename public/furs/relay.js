// 69SLAM — FURS posrednik (tunel). Spusti SAMO šifrirano povezavo do strežnika FURS.
// Ne vidi vsebine (TLS gre od trgovine do FURS), ne hrani ničesar. Brez dodatnih paketov.
"use strict";
const http = require("http"), net = require("net"), crypto = require("crypto");
const TOKEN = process.env.RELAY_TOKEN || "";
const PORT = Number(process.env.PORT || 8443);
const ALLOWED = new Set(["blagajne.fu.gov.si:9003", "blagajne-test.fu.gov.si:9002"]);
if (TOKEN.length < 32) { console.error("RELAY_TOKEN manjka"); process.exit(1); }
const eq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const srv = http.createServer((req, res) => { res.writeHead(req.url === "/health" ? 200 : 404); res.end(req.url === "/health" ? "ok" : ""); });
srv.on("connect", (req, client, head) => {
  const auth = String(req.headers["proxy-authorization"] || "");
  if (!eq(auth, `Bearer ${TOKEN}`) || !ALLOWED.has(req.url)) { client.end("HTTP/1.1 403 Forbidden\r\n\r\n"); return; }
  const [host, port] = req.url.split(":");
  const up = net.connect(Number(port), host, () => {
    client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head && head.length) up.write(head);
    up.pipe(client); client.pipe(up);
  });
  up.setTimeout(30000, () => up.destroy());
  up.on("error", () => client.destroy());
  client.on("error", () => up.destroy());
});
srv.listen(PORT, () => console.log(`FURS posrednik posluša na ${PORT}`));
