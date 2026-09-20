import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProductBySlug, getSharedDescription } from "../../../../lib/catalog";
import { getDict, LANGS, fmt } from "../../../../lib/i18n";
import AddToCart from "../../../../components/AddToCart";
import ProductBundle from "../../../../components/ProductBundle";
import { REVIEWS, REVIEW_SUMMARY } from "../../../../lib/reviews";

export function generateStaticParams() {
  const products = getProducts();
  return LANGS.flatMap((lang) => products.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const p = getProductBySlug(slug);
  if (!p) return {};
  const t = getDict(lang);
  return {
    title: `${p.name} — ${t.shop_title} | 69SLAM.si`,
    description: `69SLAM ${p.cut === "hip" ? t.line_hip : t.line_core} ${p.name}. ${t.sub}`,
    alternates: {
      canonical: `https://69slam.si/${lang}/p/${p.slug}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/p/${p.slug}`])),
    },
    openGraph: { images: p.img ? [p.img] : [] },
  };
}

export default async function ProductPage({ params }) {
  const { lang, slug } = await params;
  const t = getDict(lang);
  const p = getProductBySlug(slug);
  if (!p) notFound();
  const others = getProducts().filter((x) => x.collection === p.collection && x.cut === p.cut);
  const desc = getSharedDescription();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `69SLAM ${p.cut === "hip" ? "Hip" : "Box"} mikrofibra — ${p.name}`,
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
      <Link href={`/${lang}#shop`} className="pback">{t.back}</Link>
      <div className="pgrid">
        <div>
          <div className="pmain">
            <img src={p.img} alt={`69SLAM ${p.cut} mikrofibra ${p.name}`} />
          </div>
          {p.images.length > 1 && (
            <div className="pthumbs">
              {p.images.map((im, i) => (
                <img key={i} src={im.src} alt={`${p.name} ${i + 1}`} loading="lazy" />
              ))}
            </div>
          )}
        </div>
        <div className="pdet">
          <h1>{p.name}</h1>
          <a href="#ocene" className="pstars">★★★★★ <b>{REVIEW_SUMMARY.rating}</b> · {REVIEW_SUMMARY.count} {lang === "en" ? "reviews" : "ocen"}</a>
          <div className="mline">
            69SLAM · {p.cut === "hip" ? t.line_hip : t.line_core}{p.collection === "limited" ? ` · ${t.line_ltd}` : ""}
            {p.sale ? ` · ${t.sale_line}` : ""}
          </div>
          <div className="mprice">
            {p.sale ? (
              <>
                <span className="old">{fmt(p.price)}</span>
                <span className="rednow">{fmt(p.effPrice)}</span>
                <span style={{ display: "block", fontSize: ".74rem", fontWeight: 500, color: "var(--gray)", marginTop: 4 }}>{t.omni}: {fmt(p.price)}</span>
              </>
            ) : (
              fmt(p.price)
            )}
          </div>
          <div className="feat">
            <span>{t.t2t}</span><span>{t.t1t}</span><span>{t.t3t}</span>
          </div>
          <AddToCart code={p.code} t={t} />
          <ProductBundle code={p.code} lang={lang} />
          <p className="pdesc">{desc}</p>
          <div className="plabel">{t.other_prints}</div>
          <div className="othergrid">
            {others.slice(0, 14).map((x) => (
              <Link key={x.code} href={`/${lang}/p/${x.slug}`} className={x.code === p.code ? "cur" : ""} title={x.name}>
                <img src={x.img} alt={x.name} loading="lazy" />
              </Link>
            ))}
          </div>
          {others.length > 14 && (
            <details className="othermore">
              <summary>{lang === "en" ? `Show all ${others.length} prints` : `Pokaži vseh ${others.length} printov`}</summary>
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

      <section className="previews" id="ocene">
        <div className="pr-head">
          <h2>{lang === "en" ? "What customers say" : "Kaj pravijo kupci"}</h2>
          <a href={REVIEW_SUMMARY.url} target="_blank" rel="noopener">
            <span className="pr-stars">★★★★★</span> <b>{REVIEW_SUMMARY.rating} / 5</b> · {REVIEW_SUMMARY.count} {lang === "en" ? "reviews on Judge.me" : "ocen na Judge.me"} →
          </a>
        </div>
        <div className="pr-grid">
          {REVIEWS.map((r, i) => (
            <div className="pr-card" key={i}>
              <div className="pr-stars">★★★★★</div>
              {r.title && <b className="pr-title">{r.title}</b>}
              <p>{r.text}</p>
              <div className="pr-meta">
                <span>{r.name}{r.verified && <em>✓ {lang === "en" ? "Verified purchase" : "Preverjen nakup"}</em>}</span>
                <small>{r.about} · {r.date}</small>
              </div>
            </div>
          ))}
        </div>
        <p className="pr-note">{lang === "en"
          ? "A selection of reviews collected via Judge.me for 69slam.si, shown unedited. \"Verified purchase\" means Judge.me confirmed the order. All reviews are available at the link above."
          : "Izbor ocen, zbranih prek sistema Judge.me za 69slam.si, objavljenih brez sprememb. Oznaka »Preverjen nakup« pomeni, da je Judge.me potrdil naročilo. Vse ocene so na voljo na zgornji povezavi."}</p>
      </section>
    </main>
  );
}
