import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "69SLAM.si — moško spodnje perilo box mikrofibra",
  description: "Uradna 69SLAM spletna trgovina. Boksarice iz mikrofibre, ki ne lezejo navzgor in ostanejo na mestu ves dan.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sl">
      <body>{children}<Analytics /></body>
    </html>
  );
}
