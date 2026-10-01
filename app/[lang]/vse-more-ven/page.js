import { getOutletProducts } from "../../../lib/catalog";
import { getDict, LANGS } from "../../../lib/i18n";
import ProductGrid from "../../../components/ProductGrid";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: `${t.out_title} −50 % — 69SLAM.si`,
    description: t.out_sub,
    alternates: {
      canonical: `https://69slam.si/${lang}/vse-more-ven`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/vse-more-ven`])),
    },
  };
}

export default async function OutletPage({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  const products = getOutletProducts({ withEmpty: true });
  return (
    <main>
      <section className="pagehead outhead">
        <div className="wrap">
          <div className="over">{t.out_kicker}</div>
          <h1>{t.out_title}</h1>
          <p>{t.out_sub}</p>
        </div>
      </section>
      <section className="shop wrap">
        <ProductGrid products={products} lang={lang} t={t} mode="outlet" />
        <p className="outnote">{t.out_final}</p>
      </section>
    </main>
  );
}
