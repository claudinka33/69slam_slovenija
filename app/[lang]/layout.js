import { notFound } from "next/navigation";
import Newsletter from "../../components/Newsletter";
import { getProducts, slimProduct, primeCatalog } from "../../lib/catalog";
import { getDict, LANGS } from "../../lib/i18n";
import { COMPANY } from "../../lib/legal";
import { CartProvider } from "../../components/CartContext";
import Header from "../../components/Header";
import CartDrawer from "../../components/CartDrawer";
import BundleBuilder from "../../components/BundleBuilder";
import Consent, { ConsentLink } from "../../components/Consent";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }) {
  await primeCatalog();
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const t = getDict(lang);
  const products = getProducts({ withEmpty: true }).map(slimProduct);

  return (
    <CartProvider products={products}>
      <Header lang={lang} t={t} />
      {children}
      <footer className="site" id="faq">
        <div className="wrap" style={{ display: "block" }}><Newsletter lang={lang} /></div>
        <div className="wrap">
          <div>
            <h4>69SLAM.si</h4>
            <p>{t.foot_about}</p>
          </div>
          <div>
            <h4>{t.foot_shop}</h4>
            <a href={`/${lang}#shop`}>{t.shop_title}</a>
            <a href={`/${lang}/kopalke`}>{t.swim_title}</a>
            <a href={`/${lang}/vse-more-ven`}>{t.out_title} −50 %</a>
          </div>
          <div>
            <h4>{t.foot_help}</h4>
            <a href={`/${lang}/info/dostava-in-placilo`}>{t.f_ship}</a>
            <a href={`/${lang}/info/vracila-in-odstop`}>{t.f_return}</a>
            <a href={`/${lang}/info/reklamacije`}>{t.f_claims}</a>
            <a href={`/${lang}/info/splosni-pogoji`}>{t.f_terms}</a>
            <a href={`/${lang}/info/zasebnost`}>{t.f_privacy}</a>
            <a href={`/${lang}/info/piskotki`}>{t.f_cookies}</a>
            <ConsentLink lang={lang} />
          </div>
          <div>
            <h4>{t.foot_contact}</h4>
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            <a href={`tel:+386${COMPANY.phone.replace(/\s/g, "").slice(1)}`}>{COMPANY.phone}</a>
            <a href="https://www.instagram.com/69slam.si/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.tiktok.com/@69slam.si" target="_blank" rel="noopener">TikTok</a>
          </div>
          <div className="legal">
            {COMPANY.name} · {COMPANY.address} · Matična št.: {COMPANY.reg} · ID za DDV: {COMPANY.vat} · Vpis: {COMPANY.court} · Osnovni kapital: {COMPANY.capital}
            <br />
            {t.legal} · <a href="/admin" className="adminlink" rel="nofollow">Admin</a>
          </div>
        </div>
      </footer>
      <CartDrawer lang={lang} t={t} />
      <BundleBuilder t={t} />
      <Consent lang={lang} />
    </CartProvider>
  );
}
