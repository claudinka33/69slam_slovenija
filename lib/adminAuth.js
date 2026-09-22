/** Skupna logika za admin prijavo (deluje v node in edge okolju — Web Crypto). */
export const ADMIN_COOKIE = "admin69";

export async function adminToken() {
  const secret = process.env.ADMIN_PASSWORD || "";
  const data = new TextEncoder().encode(secret + "::69slam-admin");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidAdminCookie(value) {
  if (!process.env.ADMIN_PASSWORD) return false;
  return value === (await adminToken());
}
