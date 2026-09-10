import { getDict } from "../../../lib/i18n";
import CheckoutForm from "../../../components/CheckoutForm";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  return { title: `${t.ck_title} | 69SLAM.si`, robots: { index: false } };
}

export default async function CheckoutPage({ params }) {
  const { lang } = await params;
  const t = getDict(lang);
  return (
    <main className="ckpage wrap">
      <div className="over">69SLAM.si</div>
      <h2>{t.ck_title}</h2>
      <CheckoutForm lang={lang} t={t} />
    </main>
  );
}
