/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PDF računi: pdfkit iz node_modules (s pisavami in podatki) + naše pisave
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/catalog.json", "./assets/fonts/**/*", "./public/brand/**/*", "./node_modules/pdfkit/js/data/**/*"],
  },
  // stara Shopify trgovina → nova (SEO): vse stare poti gredo v /api/legacy, ki vrne 301 na pravi novi naslov
  async rewrites() {
    const legacy = ["products/:path*", "collections/:path*", "pages/:path*", "blogs/:path*", "policies/:path*", "cart", "account/:path*", "search"];
    return {
      beforeFiles: [
        ...legacy.map((s) => ({ source: `/${s}`, destination: `/api/legacy?p=/${s}` })),
        ...legacy.map((s) => ({ source: `/:loc([a-z]{2}|[a-z]{2}-[a-z]{2})/${s}`, destination: `/api/legacy?p=/:loc/${s}` })),
      ],
    };
  },
  async redirects() {
    return [{ source: "/", destination: "/sl", permanent: true }];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
