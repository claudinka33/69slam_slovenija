import { getProducts } from "../../lib/catalog";
import { getDict } from "../../lib/i18n";
import ProductGrid from "../../components/ProductGrid";
import BundleBar from "../../components/BundleBar";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: `69SLAM.si — ${t.shop_title}`,
    description: t.sub,
    alternates: {
      canonical: `https://69slam.si/${lang}`,
      languages: { sl: "https://69slam.si/sl", hr: "https://69slam.si/hr", en: "https://69slam.si/en" },
    },
  };
}

export default async function Home({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  const products = getProducts();
  const hero = products.find((p) => p.totalStock >= 10) || products[0];

  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="kicker">{t.kicker}</span>
            <h1>{t.h1a}<br /><em>{t.h1b}</em></h1>
            <p className="sub">{t.sub}</p>
            <div className="specs">
              <div className="spec"><b>{products.length}</b><span>{t.spec1}</span></div>
              <div className="spec"><b>2×</b><span>{t.spec2}</span></div>
              <div className="spec"><b>0</b><span>{t.spec3}</span></div>
            </div>
            <a className="cta" href="#shop">{t.cta_shop}</a>
            <a className="cta ghost" href="#tech">{t.cta_why}</a>
          </div>
          <div className="heroart" style={{ backgroundImage: `url('${hero?.img}')` }} />
        </div>
      </section>

      <section className="usps">
        <div className="wrap">
          <div className="usp"><span className="dot">▸</span><span>{t.usp1}</span></div>
          <div className="usp"><span className="dot">▸</span><span>{t.usp2}</span></div>
          <div className="usp"><span className="dot">▸</span><span>{t.usp3}</span></div>
          <div className="usp"><span className="dot">▸</span><span>{t.usp4}</span></div>
        </div>
      </section>

      <section className="shop wrap" id="shop">
        <div className="shead">
          <div className="over">{t.shop_over}</div>
          <h2>{t.shop_title}</h2>
          <div className="note">{t.shop_note}</div>
        </div>
        <ProductGrid products={products} lang={lang} t={t} />
      </section>

      <BundleBar t={t} />

      <section className="tech" id="tech">
        <div className="wrap">
          <div className="over">{t.tech_over}</div>
          <h2>{t.tech_title}</h2>
          <div className="cols">
            <div className="tcard"><div className="big">STAY</div><h3>{t.t2t}</h3><p>{t.t2p}</p></div>
            <div className="tcard"><div className="big">DRY</div><h3>{t.t1t}</h3><p>{t.t1p}</p></div>
            <div className="tcard"><div className="big">FRESH</div><h3>{t.t3t}</h3><p>{t.t3p}</p></div>
          </div>
          <p className="taud">{t.t_aud}</p>
        </div>
      </section>

      <section className="story" id="story">
        <div className="wrap">
          <div className="over">{t.story_over}</div>
          <h2>{t.story_title}</h2>
          <div className="scols">
            <p>{t.story_p1}</p>
            <p>{t.story_p2}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
