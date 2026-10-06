/**
 * Merjenje (Meta Pixel + GA4) — samo s privolitvijo obiskovalca.
 * Soglasje se hrani v lokalni shrambi brskalnika pod ključem "consent69".
 * Dogodki, sproženi preden se obiskovalec odloči, počakajo v vrsti in se pošljejo,
 * ko privolitev da (če jo zavrne, se zavržejo).
 */

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1157011362114344";
// glavna GA4 lastnost »69slam Slovenia« (zgodovina iz Shopifyja) + nova »www.69slam.si – GA4«
export const GA_IDS = (process.env.NEXT_PUBLIC_GA4_ID || "G-RGW460V30K,G-KR04JRG6PQ").split(",").map((x) => x.trim()).filter(Boolean);
export const GA_ID = GA_IDS[0];

const KEY = "consent69";
const VERSION = 1;

export function getConsent() {
  if (typeof window === "undefined") return null;
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (c && c.v === VERSION) return c;
  } catch {}
  return null;
}

export function saveConsent({ analytics, marketing }) {
  const c = { v: VERSION, analytics: !!analytics, marketing: !!marketing, ts: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  window.__consent69 = c;
  window.dispatchEvent(new CustomEvent("consent69", { detail: c }));
  return c;
}

/** Trenutno soglasje (tudi če lokalna shramba ne deluje — velja do osvežitve strani). */
export function currentConsent() {
  if (typeof window === "undefined") return null;
  return window.__consent69 || getConsent();
}

const GA_NAME = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

const pending = [];

function send(c, name, data, eventId) {
  const items = data.items || [];
  const value = Math.round((data.value || 0) * 100) / 100;
  if (c.marketing && typeof window.fbq === "function") {
    const params = {
      value,
      currency: "EUR",
      content_type: "product",
      content_ids: [...new Set(items.map((i) => i.id))],
      contents: items.map((i) => ({ id: i.id, quantity: i.qty || 1, item_price: i.price })),
      num_items: items.reduce((a, i) => a + (i.qty || 1), 0),
    };
    if (items.length === 1) params.content_name = items[0].name;
    window.fbq("track", name, params, eventId ? { eventID: eventId } : undefined);
  }
  if (c.analytics && typeof window.gtag === "function" && GA_NAME[name]) {
    window.gtag("event", GA_NAME[name], {
      currency: "EUR",
      value,
      ...(data.orderId ? { transaction_id: String(data.orderId) } : {}),
      items: items.map((i) => ({
        item_id: i.id, item_name: i.name, item_variant: i.size, price: i.price, quantity: i.qty || 1,
      })),
    });
  }
}

/**
 * Pošlje e-commerce dogodek.
 * @param {"ViewContent"|"AddToCart"|"InitiateCheckout"|"Purchase"} name
 * @param {{value:number, items:{id:string,name?:string,price?:number,qty?:number,size?:string}[], orderId?:string|number}} data
 * @param {string} [eventId] za deduplikacijo s Conversions API (Purchase)
 */
export function track(name, data = {}, eventId) {
  if (typeof window === "undefined") return;
  const c = currentConsent();
  if (!c) {
    if (pending.length < 30) pending.push([name, data, eventId]);
    return;
  }
  if (!c.analytics && !c.marketing) return;
  try { send(c, name, data, eventId); } catch {}
}

/** Pokliče komponenta za soglasje, ko so skripte pripravljene. */
export function flushPending() {
  const c = currentConsent();
  const list = pending.splice(0);
  if (!c) return;
  for (const [n, d, id] of list) {
    try { send(c, n, d, id); } catch {}
  }
}

/** Piškotka _fbp/_fbc za Conversions API (samo ob oglaševalski privolitvi). */
export function adCookies() {
  const c = currentConsent();
  if (!c?.marketing) return { consent: false };
  const get = (n) => {
    const m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  let fbc = get("_fbc");
  if (!fbc) {
    try {
      const id = new URLSearchParams(window.location.search).get("fbclid") || sessionStorage.getItem("fbclid69");
      if (id) fbc = `fb.1.${Date.now()}.${id}`;
    } catch {}
  }
  return { consent: true, fbp: get("_fbp"), fbc, url: window.location.href };
}
