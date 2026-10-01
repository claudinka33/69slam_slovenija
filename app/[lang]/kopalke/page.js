import { getSwimProducts, primeCatalog } from "../../../lib/catalog";
import { getDict, LANGS } from "../../../lib/i18n";
import ProductGrid from "../../../components/ProductGrid";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: `${t.swim_title} — 69SLAM.si`,
    description: t.swim_sub,
    alternates: {
      canonical: `https://69slam.si/${lang}/kopalke`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/kopalke`])),
    },
  };
}

export default async function SwimPage({ params }) {
  await primeCatalog();
  const { lang } = await params;
  const t = getDict(lang);
  const products = getSwimProducts({ withEmpty: true });
  return (
    <main>
      <section className="pagehead swimhead">
        <div className="wrap">
          <div className="over">☀️ {t.swim_over}</div>
          <h1>{t.swim_title}</h1>
          <p>{t.swim_sub}</p>
        </div>
      </section>
      <section className="shop wrap">
        <ProductGrid products={products} lang={lang} t={t} mode="swim" />
      </section>
    </main>
  );
}
