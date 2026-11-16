import { NextResponse } from "next/server";
import { dbConfigured } from "../../../lib/db";
import {
  INV_COOKIE, ensureInvSchema, getPinHash, pinHash, tokenFor, isInvAuthed,
  checkLock, saveLock, invArticles, openEntries, upsertEntries,
} from "../../../lib/inventura";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const J = (d, s = 200) => NextResponse.json(d, { status: s, headers: { "Cache-Control": "no-store" } });

/** Tablica: artikli + odprti vnosi (?part=entries → samo vnosi). */
export async function GET(req) {
  if (!dbConfigured()) return J({ ok: false, message: "Baza ni povezana." }, 503);
  await ensureInvSchema();
  if (!(await isInvAuthed(req))) return J({ ok: false, auth: false, pinSet: Boolean(await getPinHash()) }, 401);
  const part = req.nextUrl.searchParams.get("part");
  const entries = await openEntries();
  if (part === "entries") return J({ ok: true, entries });
  return J({ ok: true, articles: await invArticles(), entries });
}

export async function POST(req) {
  if (!dbConfigured()) return J({ ok: false, message: "Baza ni povezana." }, 503);
  await ensureInvSchema();
  const body = await req.json().catch(() => ({}));

  if (body.action === "login") {
    const h = await getPinHash();
    if (!h) return J({ ok: false, message: "PIN še ni nastavljen. Claudia ga nastavi v adminu → Inventura." }, 400);
    const lock = await checkLock();
    if (lock.until && Date.now() < lock.until)
      return J({ ok: false, message: `Preveč napačnih poskusov. Poskusi čez ${Math.ceil((lock.until - Date.now()) / 60000)} min.` }, 429);
    const pin = String(body.pin || "").replace(/\D/g, "");
    if (pinHash(pin) !== h) {
      const fails = (lock.fails || 0) + 1;
      await saveLock(fails >= 8 ? { fails: 0, until: Date.now() + 15 * 60000 } : { fails, until: 0 });
      await new Promise((r) => setTimeout(r, 600));
      return J({ ok: false, message: "Napačen PIN." }, 401);
    }
    if (lock.fails) await saveLock({ fails: 0, until: 0 });
    const res = J({ ok: true });
    res.cookies.set(INV_COOKIE, tokenFor(h), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  if (!(await isInvAuthed(req))) return J({ ok: false, auth: false, message: "Ni prijave." }, 401);

  if (body.action === "sync") {
    const saved = await upsertEntries(body.entries);
    return J({ ok: true, saved, entries: await openEntries() });
  }
  return J({ ok: false, message: "Neznano dejanje." }, 400);
}
