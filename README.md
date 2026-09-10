# 69SLAM.si — spletna trgovina

Trgovina za moško spodnje perilo 69SLAM (box mikrofibra). Next.js, trije jeziki (SI/HR/EN),
odprodaja −50 %, kampanja Paket 3 (−15 %), SEO (sitemap, structured data).

**Trenutno stanje: OGRODJE.** Trgovina, košarica in blagajna delujejo; sprejem naročil,
plačila (Stripe), e-maili (Resend) in admin/CMS se vklopijo v naslednjih korakih —
temelj zanje je že pripravljen (`prisma/schema.prisma`, `app/api/order`, `.env.example`).

---

## 1. Objava na GitHub (prvič)

1. Prijavi se na [github.com](https://github.com) → zgoraj desno **+** → **New repository**.
2. Ime: `69slam-trgovina`, izberi **Private**, klikni **Create repository**.
3. Najlažja pot brez ukazov: na strani novega repozitorija klikni **uploading an existing file**,
   povleci **vsebino** te mape (vse datoteke in podmape) v okno in klikni **Commit changes**.
   - Če imaš Git nameščen, pa v tej mapi:
     ```
     git init
     git add .
     git commit -m "69slam trgovina - ogrodje"
     git branch -M main
     git remote add origin https://github.com/TVOJE-IME/69slam-trgovina.git
     git push -u origin main
     ```

## 2. Objava na Vercel

1. Prijavi se na [vercel.com](https://vercel.com) (najlažje kar z GitHub računom).
2. **Add New → Project** → izberi repozitorij `69slam-trgovina` → **Import**.
3. Ničesar ni treba nastavljati (Vercel sam prepozna Next.js) → **Deploy**.
4. Po ~1 minuti dobiš naslov tipa `69slam-trgovina.vercel.app` — trgovina je živa.

## 3. Povezava domene 69slam.si

1. V Vercelu: projekt → **Settings → Domains** → vpiši `69slam.si` (in `www.69slam.si`).
2. Vercel pokaže DNS zapisa (A zapis in CNAME) — vpiši ju pri svojem registrarju domene.
3. Počakaj, da se DNS osveži (od nekaj minut do nekaj ur). SSL uredi Vercel sam.

## 4. Slike izdelkov (pomembno!)

Stran zaenkrat kaže slike s Shopify CDN. **Preden ukineš Shopify**, slike preseli k sebi:

```
npm install
npm run slike
```

To prenese vseh 212 slik v `public/img/products/`. Nato:
1. v `.gitignore` izbriši vrstico `public/img/products/*.jpg`,
2. commitaj in pushaj slike na GitHub,
3. v Vercel → Settings → Environment Variables nastavi `NEXT_PUBLIC_LOCAL_IMAGES=1` in redeployaj.

## 5. Uvoz zaloge (pred zagonom)

Zaloga v tej verziji je posnetek iz Shopifyja (8. 9. 2026). Pravo stanje se uvozi
v naslednjem koraku (baza + admin) — predloga je v `data/uvoz-zaloge-predloga.csv`.

## 6. Lokalni razvoj (po želji)

```
npm install
npm run dev      # http://localhost:3000
```

## Struktura

- `app/[lang]/` — strani (naslovnica, izdelek `/p/[slug]`, blagajna) v SI/HR/EN
- `components/` — košarica, Paket 3, mreža izdelkov ...
- `data/catalog.json` — katalog 56 izdelkov (izvoz iz Shopifyja)
- `lib/catalog.js` — logika: odprodaja −50 % (zadnja velikost), razprodani skriti
- `prisma/schema.prisma` — pripravljen model baze za naslednji korak (naročila, zaloga, inventura, kuponi)

## Naslednji koraki (po vrsti)

1. Baza (Vercel Postgres/Neon) + sprejem naročil + odštevanje zaloge
2. Stripe (kartice) + predračun z UPN QR + povzetje
3. Resend e-maili (potrditev naročila, računi PDF) + prijava na novice + kupon za prvi nakup
4. Admin/CMS na `/admin`: naročila, tiskanje računov, zaloga, inventura, kuponi, kampanje
5. Meta Pixel + TikTok Pixel + GA4 + Google Ads konverzije
6. Pošta Slovenije (spremnice) — po dogovoru
