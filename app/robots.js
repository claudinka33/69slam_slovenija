export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/sl/blagajna", "/hr/blagajna", "/en/blagajna"] },
    sitemap: "https://69slam.si/sitemap.xml",
  };
}
