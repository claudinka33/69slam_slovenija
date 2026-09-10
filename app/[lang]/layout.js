import { notFound } from "next/navigation";
import { getProducts } from "../../lib/catalog";
import { getDict, LANGS } from "../../lib/i18n";
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
            <a href="#">{t.f_ship}</a>
            <a href="#">{t.f_return}</a>
            <a href="#">{t.f_terms}</a>
          </div>
          <div>
            <h4>{t.foot_contact}</h4>
            <a href="mailto:info@69slam.si">info@69slam.si</a>
            <a href="#">Instagram</a>
            <a href="#">Facebook</a>
          </div>
          <div className="legal">{t.legal}</div>
        </div>
      </footer>
      <CartDrawer lang={lang} t={t} />
      <BundleBuilder t={t} />
    </CartProvider>
  );
}
