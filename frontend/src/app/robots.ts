import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/_next"] },
    ],
    sitemap: "https://aboenterprise.com/sitemap.xml",
    host: "https://aboenterprise.com",
  };
}
