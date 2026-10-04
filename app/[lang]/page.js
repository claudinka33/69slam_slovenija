import Link from "next/link";
import { getMenProducts, getOutletProducts, getSwimProducts, primeCatalog } from "../../lib/catalog";
import { getDict } from "../../lib/i18n";
import ProductGrid from "../../components/ProductGrid";
import BundleBar from "../../components/BundleBar";
import Image from "next/image";
import { IMG } from "../../lib/media";
import DetailShots from "../../components/DetailShots";
import { db, dbConfigured } from "../../lib/db";

// Modeli moških kopalk na prvi strani (prve 3 črke šifre)
const SWIM_MODELS = [
  { pre: "SSM", kind: "VOLLEY", sl: "Volley short", en: "Volley short", sub: "4-way stretch" },
  { pre: "SSB", kind: "ELASTIC", sl: "Elastic", en: "Elastic", sub: "4-way stretch" },
  { pre: "SSN", kind: "BOARDSHORT", sl: "Boardshort", en: "Boardshort", sub: "4-way stretch" },
  { pre: "SSC", kind: "CLASSIC", sl: "Classic", en: "Classic", sub: "" },
  { pre: "SSL", kind: "MEDIUM", sl: "Medium length", en: "Medium length", sub: "" },
  { pre: "SLL", kind: "LONG", sl: "Long length", en: "Long length", sub: "" },
];

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: lang === "en" ? "69SLAM.si — Men's underwear & swimwear" : "69SLAM.si — Moško spodnje perilo in kopalke",
    description: t.sub,
    alternates: {
      canonical: `https://69slam.si/${lang}`,
      languages: { sl: "https://69slam.si/sl", en: "https://69slam.si/en" },
    },
  };
}

export default async function Home({ params }) {
  await primeCatalog();
  const { lang } = await params;
  const t = getDict(lang);
  const products = getMenProducts({ withEmpty: true });
  const boxers = products.filter((p) => p.group === "boksarice" && p.totalStock > 0);
  // od vsakega modela kopalk dizajn z največ zaloge (živa zaloga iz baze, sicer iz kataloga)
  const swimAll = getSwimProducts().filter((p) => p.img);
  let live = {};
  if (dbConfigured()) {
    try {
      const rows = await db()`SELECT code, SUM(GREATEST(stock,0))::int AS n FROM variants WHERE code LIKE 'SS%' OR code LIKE 'SLL%' GROUP BY code`;
      live = Object.fromEntries(rows.map((r) => [r.code, r.n]));
    } catch {}
  }
  const stockOf = (p) => live[p.code] ?? p.totalStock ?? 0;
  const swim = SWIM_MODELS.map((m) => {
    const list = swimAll.filter((p) => p.code.startsWith(m.pre) && stockOf(p) > 0).sort((a, b) => stockOf(b) - stockOf(a));
    return list.length ? { ...m, p: list[0], n: list.length } : null;
  }).filter(Boolean);
  const outlet = getOutletProducts();

  return (
    <main>
      <section className="hero hero2">
        <div className="heroimg"><Image src="/img/hero.jpg" alt="69SLAM moške spodnjice z drznim printom" fill priority sizes="100vw" /></div>
        <div className="wrap">
          <div>
            <span className="kicker">{t.kicker}</span>
            <h1>{t.h1a}<br /><em>{t.h1b}</em></h1>
            <p className="sub">{t.sub}</p>
            <div className="specs">
              <div className="spec"><b>{products.filter((p) => p.totalStock > 0).length}</b><span>{t.spec1}</span></div>
              <div className="spec"><b>500+</b><span>{t.spec2}</span></div>
              <div className="spec"><b>−15 %</b><span>{t.spec3}</span></div>
            </div>
            <a className="cta" href="#shop">{t.cta_shop}</a>
            <Link className="cta ghost" href={`/${lang}/kopalke`}>{t.cta_why}</Link>
          </div>
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

      {outlet.length > 0 && (
        <Link href={`/${lang}/vse-more-ven`} className="outbar">
          <span className="ob-tag">{t.out_badge}</span>
          <b>{t.out_banner}</b>
          <span className="ob-cta">{t.out_cta}</span>
        </Link>
      )}

      <section className="shop wrap" id="shop">
        <div className="shead">
          <div className="over">{t.shop_over}</div>
          <h2>{t.shop_title}</h2>
          <div className="note">{t.shop_note}</div>
        </div>
        <ProductGrid products={products} lang={lang} t={t} />
      </section>

      <BundleBar t={t} />

      {swim.length > 0 && (
        <section className="swimband" id="kopalke">
          <div className="wrap">
            <div className="sw-txt">
              <div className="over">☀️ {t.swim_over}</div>
              <h2>{t.swim_title}</h2>
              <p>{t.swim_sub}</p>
              <Link href={`/${lang}/kopalke`} className="cta">{t.swim_cta}</Link>
            </div>
            <div className="sw-grid">
              {swim.map((m) => (
                <Link key={m.pre} href={`/${lang}/kopalke?model=${m.kind}`} className="sw-item" title={m[lang] || m.sl}>
                  <span style={{ backgroundImage: `url('${m.p.img}')` }} />
                  <b>{m[lang] || m.sl}</b>
                  <small>{m.sub ? `${m.sub} · ` : ""}{m.n} {lang === "en" ? (m.n === 1 ? "design" : "designs") : m.n === 1 ? "dizajn" : m.n === 2 ? "dizajna" : m.n < 5 ? "dizajni" : "dizajnov"}</small>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="tech" id="tech">
        <div className="wrap">
          <div className="over">{t.tech_over}</div>
          <h2>{t.tech_title}</h2>
          <div className="cols">
            <div className="tcard"><div className="big">STAY</div><h3>{t.t2t}</h3><p>{t.t2p}</p></div>
            <div className="tcard"><div className="big">DRY</div><h3>{t.t1t}</h3><p>{t.t1p}</p></div>
            <div className="tcard"><div className="big">FRESH</div><h3>{t.t3t}</h3><p>{t.t3p}</p></div>
          </div>
          <DetailShots lang={lang} tone="dark" />
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
          <a className="cta" href={`/${lang}/zgodba`} style={{ marginTop: 24 }}>
            {lang === "en" ? "Read the full story →" : "Preberi celo zgodbo →"}
          </a>
        </div>
      </section>
    </main>
  );
}
