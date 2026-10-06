/**
 * Zaklenjena trgovina — javnost vidi samo obvestilo (503, Google počaka).
 * MAINTENANCE = true → zaklenjeno, dokler ga ne izklopiš.
 * MAINTENANCE_UNTIL → zaklenjeno samo do tega trenutka, potem se trgovina odpre SAMA (brez deploya).
 * Notri pridejo: prijavljena admin, povezava ?predogled=69slam ali vpis gesla na zaklenjeni strani.
 */
export const MAINTENANCE = false; // trajni zaklep (izklopljen)
export const MAINTENANCE_UNTIL = "2026-10-06T16:30:00Z"; // = 6. 10. 2026 ob 18:30 po slovenskem času
export const OPEN_LABEL = "danes ob 18:30";
export const PREVIEW_COOKIE = "predogled69";
export const PREVIEW_KEY = "69slam";
export const PREVIEW_PASS = "katy1830";

export function lockedNow() {
  if (MAINTENANCE) return true;
  if (!MAINTENANCE_UNTIL) return false;
  return Date.now() < Date.parse(MAINTENANCE_UNTIL);
}
