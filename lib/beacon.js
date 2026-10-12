/** Anonimna statistika obiska (brez piškotkov) — pošlje dogodek na /api/s. */
export function beacon(data) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify(data);
    if (navigator.sendBeacon && navigator.sendBeacon("/api/s", new Blob([body], { type: "text/plain" }))) return;
    fetch("/api/s", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}
