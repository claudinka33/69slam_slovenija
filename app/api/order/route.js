import { NextResponse } from "next/server";

/**
 * OGRODJE: sprejem naročila.
 * V naslednjem koraku ta endpoint dobi:
 *  - zapis naročila v bazo (Postgres/Prisma) + odštevanje zaloge
 *  - Stripe Checkout session za kartična plačila
 *  - generiranje predračuna z UPN QR (proforma)
 *  - e-mail potrditev prek Resend
 */
export async function POST(req) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.cart) || body.cart.length === 0) {
    return NextResponse.json({ ok: false, message: "Prazna košarica." }, { status: 400 });
  }

  const messages = {
    sl: "⚠️ Ogrodje: naročilo je pravilno sestavljeno, a se še ne shranjuje — baza in plačila se vklopijo v naslednjem koraku.",
    hr: "⚠️ Kostur: narudžba je ispravno složena, ali se još ne sprema — baza i plaćanja uključuju se u sljedećem koraku.",
    en: "⚠️ Skeleton: the order is correctly assembled but not yet stored — database and payments are switched on in the next step.",
  };
  return NextResponse.json({
    ok: false,
    stage: "skeleton",
    message: messages[body.lang] || messages.sl,
  }, { status: 501 });
}
