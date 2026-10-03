import { unstable_cache } from "next/cache";
import { db, dbConfigured } from "./db";

/** Odobrene ocene kupcev iz baze (predpomnjeno, osveži se z revalidateTag("reviews")). */
export const loadApprovedReviews = unstable_cache(async () => {
  if (!dbConfigured()) return [];
  try {
    const rows = await db()`SELECT id, code, name, rating, title, body, created_at FROM reviews WHERE status = 'objavljeno' ORDER BY created_at DESC LIMIT 2000`;
    return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
  } catch { return []; }
}, ["approved-reviews-v1"], { tags: ["reviews"] });

/** Ocene za artikel: najprej ta artikel, nato isti kroj (prve 3 črke šifre). */
export function reviewsFor(all, code) {
  const own = all.filter((r) => r.code === code);
  const fam = all.filter((r) => r.code !== code && r.code.slice(0, 3) === String(code).slice(0, 3));
  return [...own, ...fam];
}
