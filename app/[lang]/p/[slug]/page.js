import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProductBySlug, getSharedDescription } from "../../../../lib/catalog";
import { getDict, LANGS, fmt } from "../../../../lib/i18n";
import AddToCart from "../../../../components/AddToCart";

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
    description: `69SLAM ${t.line_core} ${p.name}. ${t.sub}`,
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
  const others = getProducts().filter((x) => x.collection === p.collection);
  const desc = getSharedDescription();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `69SLAM Box mikrofibra — ${p.name}`,
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
            <img src={p.img} alt={`69SLAM box mikrofibra ${p.name}`} />
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
          <div className="mline">
            69SLAM · {t.line_core}{p.collection === "limited" ? ` · ${t.line_ltd}` : ""}
            {p.sale ? ` · ${t.sale_line}` : ""}
          </div>
          <div className="mprice">
            {p.sale ? (
              <>
                <span className="old">{fmt(p.price)}</span>
                <span className="rednow">{fmt(p.effPrice)}</span>
              </>
            ) : (
              fmt(p.price)
            )}
          </div>
          <div className="feat">
            <span>{t.t2t}</span><span>{t.t1t}</span><span>{t.t3t}</span>
          </div>
          <AddToCart code={p.code} t={t} />
          <p className="pdesc">{desc}</p>
          <div className="plabel">{t.other_prints}</div>
          <div className="othergrid">
            {others.map((x) => (
              <Link key={x.code} href={`/${lang}/p/${x.slug}`} className={x.code === p.code ? "cur" : ""} title={x.name}>
                <img src={x.img} alt={x.name} loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
