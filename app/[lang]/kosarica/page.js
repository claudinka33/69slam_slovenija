import RestoreCart from "../../../components/RestoreCart";
import { tx } from "../../../lib/i18n";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: tx(lang, "Košarica | 69SLAM.si", "Cart | 69SLAM.si", "Košarica | 69SLAM.si"), robots: { index: false } };
}

export default async function KosaricaPage({ params, searchParams }) {
  const { lang } = await params;
  const { c } = await searchParams;
  return (
    <main className="wrap" style={{ padding: "60px 16px", minHeight: "50vh" }}>
      <h2>{tx(lang, "Tvoja košarica", "Your cart", "Tvoja košarica")} 🛒</h2>
      <RestoreCart lang={lang} token={c || ""} />
    </main>
  );
}
