import "./globals.css";

export const metadata = {
  title: "69SLAM.si — moško spodnje perilo box mikrofibra",
  description: "Uradna 69SLAM spletna trgovina. Boksarice iz mikrofibre, ki se ne rolajo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sl">
      <body>{children}</body>
    </html>
  );
}
