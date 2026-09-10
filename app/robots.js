export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/sl/blagajna", "/hr/blagajna", "/en/blagajna"] },
    sitemap: "https://69slam.si/sitemap.xml",
  };
}
