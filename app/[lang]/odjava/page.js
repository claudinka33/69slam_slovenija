import UnsubscribeBox from "../../../components/UnsubscribeBox";

export const metadata = { title: "Odjava | 69SLAM.si", robots: { index: false } };

export default async function OdjavaPage({ params, searchParams }) {
  const { lang } = await params;
  const { e, t } = await searchParams;
  return (
    <main className="wrap" style={{ padding: "60px 16px", minHeight: "50vh", maxWidth: 640 }}>
      <h2>{lang === "en" ? "Unsubscribe" : "Odjava od e-mailov"}</h2>
      <UnsubscribeBox lang={lang} email={e || ""} token={t || ""} />
    </main>
  );
}
