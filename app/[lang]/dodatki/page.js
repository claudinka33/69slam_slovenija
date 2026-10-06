import { getMenProducts, primeCatalog } from "../../../lib/catalog";
import { getDict, LANGS } from "../../../lib/i18n";
import ProductGrid from "../../../components/ProductGrid";

const TXT = {
  sl: { over: "Dodatki", title: "Kape, nogavice & dodatki", sub: "Kape, nogavice, japonke in oblačila 69SLAM — da je outfit popoln." },
  en: { over: "Accessories", title: "Caps, socks & accessories", sub: "Caps, socks, flip-flops and 69SLAM clothing — to complete the look." },
  hr: { over: "Dodaci", title: "Kape, čarape i dodaci", sub: "Kape, čarape, japanke i odjeća 69SLAM — da outfit bude savršen." },
};

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const x = TXT[lang] || TXT.sl;
  return {
    title: `${x.title} — 69SLAM.si`,
    description: x.sub,
    alternates: {
      canonical: `https://69slam.si/${lang}/dodatki`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/dodatki`])),
    },
  };
}

export default async function AccessoriesPage({ params }) {
  await primeCatalog();
  const { lang } = await params;
  const t = getDict(lang);
  const x = TXT[lang] || TXT.sl;
  const products = getMenProducts({ withEmpty: true }).filter((p) => ["dodatki", "obutev", "oblacila"].includes(p.group));
  return (
    <main>
      <section className="pagehead">
        <div className="wrap">
          <div className="over">{x.over}</div>
          <h1>{x.title}</h1>
          <p>{x.sub}</p>
        </div>
      </section>
      <section className="shop wrap">
        <ProductGrid products={products} lang={lang} t={t} mode="extra" />
      </section>
    </main>
  );
}
