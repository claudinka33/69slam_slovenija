import UnsubscribeBox from "../../../components/UnsubscribeBox";
import { tx } from "../../../lib/i18n";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: tx(lang, "Odjava | 69SLAM.si", "Unsubscribe | 69SLAM.si", "Odjava | 69SLAM.si"), robots: { index: false } };
}

export default async function OdjavaPage({ params, searchParams }) {
  const { lang } = await params;
  const { e, t } = await searchParams;
  return (
    <main className="wrap" style={{ padding: "60px 16px", minHeight: "50vh", maxWidth: 640 }}>
      <h2>{tx(lang, "Odjava od e-mailov", "Unsubscribe", "Odjava od e-mailova")}</h2>
      <UnsubscribeBox lang={lang} email={e || ""} token={t || ""} />
    </main>
  );
}
