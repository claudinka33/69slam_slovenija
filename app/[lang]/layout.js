import { notFound } from "next/navigation";
import { getProducts } from "../../lib/catalog";
import { getDict, LANGS } from "../../lib/i18n";
import { COMPANY } from "../../lib/legal";
import { CartProvider } from "../../components/CartContext";
import Header from "../../components/Header";
import CartDrawer from "../../components/CartDrawer";
import BundleBuilder from "../../components/BundleBuilder";

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();
  const t = getDict(lang);
  const products = getProducts();

  return (
    <CartProvider products={products}>
      <Header lang={lang} t={t} />
      {children}
      <footer className="site" id="faq">
        <div className="wrap">
          <div>
            <h4>69SLAM.si</h4>
            <p>{t.foot_about}</p>
          </div>
          <div>
            <h4>{t.foot_shop}</h4>
            <a href={`/${lang}#shop`}>{t.shop_title}</a>
            <a href={`/${lang}#shop`}>{t.filter_limited}</a>
          </div>
          <div>
            <h4>{t.foot_help}</h4>
            <a href={`/${lang}/info/dostava-in-placilo`}>{t.f_ship}</a>
            <a href={`/${lang}/info/vracila-in-odstop`}>{t.f_return}</a>
            <a href={`/${lang}/info/reklamacije`}>{t.f_claims}</a>
            <a href={`/${lang}/info/splosni-pogoji`}>{t.f_terms}</a>
            <a href={`/${lang}/info/zasebnost`}>{t.f_privacy}</a>
            <a href={`/${lang}/info/piskotki`}>{t.f_cookies}</a>
          </div>
          <div>
            <h4>{t.foot_contact}</h4>
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            <a href={`tel:+386${COMPANY.phone.replace(/\s/g, "").slice(1)}`}>{COMPANY.phone}</a>
            <a href="#">Instagram</a>
            <a href="#">Facebook</a>
          </div>
          <div className="legal">
            {COMPANY.name} · {COMPANY.address} · Matična št.: {COMPANY.reg} · ID za DDV: {COMPANY.vat} · Vpis: {COMPANY.court} · Osnovni kapital: {COMPANY.capital}
            <br />
            {t.legal}
          </div>
        </div>
      </footer>
      <CartDrawer lang={lang} t={t} />
      <BundleBuilder t={t} />
    </CartProvider>
  );
}
