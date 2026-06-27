import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aboenterprise.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/products`,lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/services`,lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/projects`,lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/about`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  // Fetch dynamic service slugs from API (graceful fallback)
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services?per_page=50`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const { data } = await res.json();
      const serviceRoutes: MetadataRoute.Sitemap = (data || []).map((s: { slug: string; updated_at: string }) => ({
        url: `${BASE}/services/${s.slug}`,
        lastModified: new Date(s.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
      return [...staticRoutes, ...serviceRoutes];
    }
  } catch { /* api not available during build */ }

  return staticRoutes;
}
