import RestoreCart from "../../../components/RestoreCart";

export const metadata = { title: "Košarica | 69SLAM.si", robots: { index: false } };

export default async function KosaricaPage({ params, searchParams }) {
  const { lang } = await params;
  const { c } = await searchParams;
  return (
    <main className="wrap" style={{ padding: "60px 16px", minHeight: "50vh" }}>
      <h2>{lang === "en" ? "Your cart" : "Tvoja košarica"} 🛒</h2>
      <RestoreCart lang={lang} token={c || ""} />
    </main>
  );
}
