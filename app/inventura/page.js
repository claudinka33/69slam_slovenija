import Inventura from "./Inventura";

export const metadata = {
  title: "Inventura · 69SLAM",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Inventura", statusBarStyle: "black" },
};
export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#0a0a0a" };

export default function Page() {
  return <Inventura />;
}
