import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProductBySlug, defaultDescription, primeCatalog, getSetPartners, getPairings } from "../../../../lib/catalog";
import { Pairings, RecentlyViewed } from "../../../../components/ProductRow";
import CompleteSet from "../../../../components/CompleteSet";
import { getDict, LANGS, fmt, tx } from "../../../../lib/i18n";
import { typeLabel } from "../../../../lib/typeLabel";
import AddToCart from "../../../../components/AddToCart";
import ProductGallery from "../../../../components/ProductGallery";
import ProductBundle from "../../../../components/ProductBundle";
import { REVIEWS, REVIEW_SUMMARY } from "../../../../lib/reviews";
import { loadApprovedReviews, reviewsFor } from "../../../../lib/customerReviews";
import { GALLERY } from "../../../../lib/media";
import DetailShots, { swimDetailKind } from "../../../../components/DetailShots";
import { TrackView } from "../../../../components/Track";
import { swimFeatures } from "../../../../lib/descriptions";

export function generateStaticParams() {
  const products = getProducts({ withEmpty: true });
  return LANGS.flatMap((lang) => products.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }) {
  await primeCatalog();
  const { lang, slug } = await params;
  const p = getProductBySlug(slug);
  if (!p) return {};
  const t = getDict(lang);
  const micro = p.group === "boksarice" && p.material === "mikrofibra";
  return {
    title: micro ? `${p.name} — ${t.shop_title} | 69SLAM.si` : `${p.name} — ${typeLabel(p.type, lang)} | 69SLAM.si`,
    description: micro ? `69SLAM ${p.cut === "hip" ? t.line_hip : t.line_core} ${p.name}. ${t.sub}` : `69SLAM ${typeLabel(p.type, lang)} ${p.name}.${p.outlet ? " " + t.out_line + "." : ""}`,
    alternates: {
      canonical: `https://69slam.si/${lang}/p/${p.slug}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/p/${p.slug}`])),
    },
    openGraph: { images: p.img ? [p.img] : [] },
  };
}

export default async function ProductPage({ params }) {
  await primeCatalog();
  const { lang, slug } = await params;
  const t = getDict(lang);
  const p = getProductBySlug(slug);
  if (!p) notFound();
  // ocene kupcev iz CMS (odobrene) + izbrane ocene iz Shopifyja
  const dbRev = reviewsFor(await loadApprovedReviews(), p.code);
  const allCount = REVIEW_SUMMARY.count + dbRev.length;
  const allAvg = (parseFloat(REVIEW_SUMMARY.rating.replace(",", ".")) * REVIEW_SUMMARY.count + dbRev.reduce((a, r) => a + r.rating, 0)) / allCount;
  const SUM = { rating: allAvg.toFixed(2).replace(".", ","), count: allCount };
  const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);
  const dfmt = (d) => { const x = new Date(d); return `${x.getDate()}. ${x.getMonth() + 1}. ${x.getFullYear()}`; };
  const micro = p.group === "boksarice" && p.material === "mikrofibra";
  const boxers = p.group === "boksarice";
  const others = getProducts().filter((x) =>
    micro ? x.group === "boksarice" && x.material === "mikrofibra" && x.collection === p.collection && x.cut === p.cut
      : x.group === p.group && x.gender === p.gender && (!boxers || (x.cut === p.cut && x.material === p.material)));
  const desc = p.description ? p.description : defaultDescription(p, t, lang);
  const red = p.sale || p.outlet;
  const backHref = p.outlet ? `/${lang}/vse-more-ven` : p.group === "kopalke" ? `/${lang}/kopalke` : `/${lang}#shop`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: micro ? `69SLAM ${p.cut === "hip" ? "Hip" : "Box"} mikrofibra — ${p.name}` : `69SLAM ${typeLabel(p.type, lang)} — ${p.name}`,
    image: p.images.map((im) => im.src),
    description: desc,
    sku: p.code,
    brand: { "@type": "Brand", name: "69SLAM" },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: p.effPrice.toFixed(2),
      availability: "https://schema.org/InStock",
      url: `https://69slam.si/${lang}/p/${p.slug}`,
    },
  };

  return (
    <main className="ppage wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView id={p.code} name={p.name} price={p.effPrice} />
      <Link href={backHref} className="pback">{t.back}</Link>
      <div className="pgrid">
        <ProductGallery images={p.images.length ? p.images : (p.img ? [{ src: p.img }] : [])} name={p.name} lang={lang}
          alt={micro ? `69SLAM ${p.cut} mikrofibra ${p.name}` : `69SLAM ${typeLabel(p.type, lang)} ${p.name}`} />
        <div className="pdet">
          <h1>{p.name}</h1>
          <div className="pcode">{tx(lang, "Šifra", "Code", "Šifra")}: {p.code}</div>
          {<a href="#ocene" className="pstars">★★★★★ <b>{SUM.rating}</b> · {SUM.count} {tx(lang, "ocen", "reviews", "recenzija")}</a>}
          {(() => { const f = p.group === "kopalke" && swimFeatures(p.code, lang); return f ? (
            <div className="swimfeat">
              <span className={f.mesh ? "on" : "off"}>{f.mesh ? "✓" : "✕"} {f.meshLabel}</span>
              <span className="on">✓ {f.pocketLabel}</span>
            </div>) : null; })()}
          <div className="mline">
            {micro ? <>69SLAM · {p.cut === "hip" ? t.line_hip : t.line_core}{p.collection === "limited" ? ` · ${t.line_ltd}` : ""}</> : <>69SLAM · {typeLabel(p.type, lang)}</>}
            {p.sale ? ` · ${t.sale_line}` : ""}{p.outlet ? ` · ${t.out_line}` : ""}
          </div>
          <div className="mprice">
            {red ? (
              <>
                <span className="old">{fmt(p.price)}</span>
                <span className="rednow">{fmt(p.effPrice)}</span>
                <span className="omni">{t.omni}: {fmt(p.low30 ?? p.price)}</span>
              </>
            ) : (
              <>
                {fmt(p.price)}
                <span className="omni">{t.omni}: {fmt(p.low30 ?? p.price)}</span>
              </>
            )}
          </div>
          {micro && (
          <div className="feat">
            <span>{t.t2t}</span><span>{t.t1t}</span><span>{t.t3t}</span>
          </div>
          )}
          {boxers && (
          <details className="sizeguide">
            <summary>{tx(lang, "Katera velikost je zame?", "Which size fits me?", "Koja mi veličina odgovara?")}</summary>
            <table>
              <thead>
                <tr>
                  <th>{tx(lang, "Velikost", "Size", "Veličina")}</th>
                  <th>{tx(lang, "Pas (cm)", "Waist (cm)", "Struk (cm)")}</th>
                  <th>{tx(lang, "Nizek pas (cm)", "Low waist (cm)", "Niski struk (cm)")}</th>
                  <th>{tx(lang, "Št. hlač", "Jeans size", "Br. hlača")}</th>
                </tr>
              </thead>
              <tbody>
                {[["XS", "69–73", "71–76", "28"], ["S", "73–79", "76–81", "30"], ["M", "79–83", "81–86", "32"], ["L", "83–89", "86–91", "34"], ["XL", "89–93", "91–96", "36"], ["XXL", "93–99", "96–101", "38"]].map((r) => (
                  <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>
                ))}
              </tbody>
            </table>
            <p>{tx(lang,
              "Pas: obseg na najožjem delu pasu. Nizek pas: obseg tik nad kolkom – tam, kjer sedi elastika. Uradna tabela velikosti 69SLAM.",
              "Waist: around the narrowest part of your waist. Low waist: around your natural waist, just above the hip bone – where the waistband sits. Official 69SLAM size guide.",
              "Struk: opseg na najužem dijelu struka. Niski struk: opseg tik iznad kuka – ondje gdje sjedi elastika. Službena tablica veličina 69SLAM.")}</p>
          </details>
          )}
          <AddToCart code={p.code} t={t} />
          <CompleteSet codes={getSetPartners(p).map((x) => x.code)} lang={lang} t={t} />
          <ProductBundle code={p.code} lang={lang} />
          <p className="pdesc" style={{ whiteSpace: "pre-line" }}>{desc}</p>
          <div className="plabel">{micro ? t.other_prints : t.other_items}</div>
          <div className="othergrid">
            {others.slice(0, 14).map((x) => (
              <Link key={x.code} href={`/${lang}/p/${x.slug}`} className={x.code === p.code ? "cur" : ""} title={x.name}>
                <img src={x.img} alt={x.name} loading="lazy" />
              </Link>
            ))}
          </div>
          {others.length > 14 && (
            <details className="othermore">
              <summary>{tx(lang, `Pokaži vseh ${others.length} printov`, `Show all ${others.length} prints`, `Prikaži svih ${others.length} printova`)}</summary>
              <div className="othergrid">
                {others.slice(14).map((x) => (
                  <Link key={x.code} href={`/${lang}/p/${x.slug}`} className={x.code === p.code ? "cur" : ""} title={x.name}>
                    <img src={x.img} alt={x.name} loading="lazy" />
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {micro && <DetailShots lang={lang} tone="light" />}
      {!micro && boxers && p.material === "bambus" && <DetailShots lang={lang} tone="light" kind="bambus" />}
      {p.group === "kopalke" && swimDetailKind(p.code) && <DetailShots lang={lang} tone="light" kind={swimDetailKind(p.code)} />}

      {boxers && (
      <section className="pgal">
        <div className="pr-head">
          <h2>{tx(lang, "Narejene, da se jih vidi", "Made to be seen", "Napravljene da se vide")}</h2>
          <div className="pr-sum">#playloud · @69slam.slovenija</div>
        </div>
        <div className="pgal-strip">
          {GALLERY.map((src, i) => (
            <img key={i} src={src} alt={`69SLAM ${i + 1}`} loading="lazy" />
          ))}
        </div>
      </section>

      )}

      <Pairings codes={getPairings(p).map((x) => x.code)} lang={lang} t={t} />
      <RecentlyViewed code={p.code} lang={lang} t={t} />

      {(
      <section className="previews" id="ocene">
        <div className="pr-head">
          <h2>{tx(lang, "Kaj pravijo kupci", "What customers say", "Što kažu kupci")}</h2>
          <div className="pr-sum">
            <span className="pr-stars">★★★★★</span> <b>{SUM.rating} / 5</b> · {SUM.count} {tx(lang, "ocen kupcev", "customer reviews", "recenzija kupaca")}
          </div>
        </div>
        <div className="pr-grid">
          {dbRev.slice(0, 9).map((r) => (
            <div className="pr-card" key={"d" + r.id}>
              <div className="pr-stars">{stars(r.rating)}</div>
              {r.title && <b className="pr-title">{r.title}</b>}
              {r.body && <p>{r.body}</p>}
              <div className="pr-meta">
                <span>{r.name}<em>✓ {tx(lang, "Preverjen nakup", "Verified purchase", "Provjerena kupnja")}</em></span>
                <small>{dfmt(r.created_at)}</small>
              </div>
            </div>
          ))}
          {REVIEWS.map((r, i) => (
            <div className="pr-card" key={i}>
              <div className="pr-stars">★★★★★</div>
              {r.title && <b className="pr-title">{r.title}</b>}
              <p>{r.text}</p>
              <div className="pr-meta">
                <span>{r.name}{r.verified && <em>✓ {tx(lang, "Preverjen nakup", "Verified purchase", "Provjerena kupnja")}</em>}</span>
                <small>{r.about} · {r.date}</small>
              </div>
            </div>
          ))}
        </div>
        <p className="pr-note">{tx(lang,
          "Izbor ocen kupcev trgovine 69slam.si, objavljenih brez sprememb. Oznaka »Preverjen nakup« pomeni, da je ocena povezana z dejanskim naročilom v naši trgovini.",
          "A selection of reviews from 69slam.si customers, shown unedited. \"Verified purchase\" means the review is linked to an actual order in our shop.",
          "Izbor recenzija kupaca trgovine 69slam.si, objavljenih bez izmjena. Oznaka »Provjerena kupnja« znači da je recenzija povezana sa stvarnom narudžbom u našoj trgovini.")}</p>
      </section>
      )}
    </main>
  );
}
