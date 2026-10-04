/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PDF računi: pdfkit iz node_modules (s pisavami in podatki) + naše pisave
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./assets/fonts/**/*", "./public/brand/**/*", "./node_modules/pdfkit/js/data/**/*"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
};

export default nextConfig;
