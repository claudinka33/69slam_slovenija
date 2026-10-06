import { getMenProducts, primeCatalog } from "../../../lib/catalog";
import { getDict, LANGS, tx } from "../../../lib/i18n";
import ProductGrid from "../../../components/ProductGrid";
import BundleBar from "../../../components/BundleBar";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: tx(lang, "Moške spodnjice — boksarice iz mikrofibre in bambusa | 69SLAM.si", "Men's underwear — microfibre & bamboo boxers | 69SLAM.si", "Muške bokserice od mikrofibre i bambusa | 69SLAM.si"),
    description: tx(lang, "69SLAM boksarice v kroju BOX in HIP — drzni printi, ne lezejo navzgor. Paket 3 −15 %.", "69SLAM boxers in BOX and HIP cuts — bold prints, they don't ride up. Bundle of 3 −15 %.", "69SLAM bokserice u kroju BOX i HIP — odvažni printovi, ne podižu se. Paket 3 −15 %."),
    alternates: {
      canonical: `https://69slam.si/${lang}/spodnjice`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/spodnjice`])),
    },
  };
}

export default async function UnderwearPage({ params }) {
  await primeCatalog();
  const { lang } = await params;
  const t = getDict(lang);
  const products = getMenProducts({ withEmpty: true }).filter((p) => p.group === "boksarice");
  return (
    <main>
      <section className="pagehead underhead">
        <div className="wrap">
          <div className="over">{t.shop_over}</div>
          <h1>{tx(lang, "Moške spodnjice", "Men's underwear", "Muške bokserice")}</h1>
          <p>{tx(lang, "Boksarice iz mikrofibre in bambusa, ki ne lezejo navzgor in ostanejo na mestu ves dan. Izberi kroj in print — katerekoli 3 skupaj −15 %.",
                 "Microfibre and bamboo boxers that don't ride up and stay put all day. Pick your cut and print — any 3 together −15 %.",
                 "Bokserice od mikrofibre i bambusa koje se ne podižu i ostaju na mjestu cijeli dan. Odaberi kroj i print — bilo koje 3 zajedno −15 %.")}</p>
        </div>
      </section>
      <section className="shop wrap">
        <ProductGrid products={products} lang={lang} t={t} mode="men" />
      </section>
      <BundleBar t={t} />
    </main>
  );
}
