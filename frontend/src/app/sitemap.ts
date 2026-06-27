import { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aboenterprise.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/products`,lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/services`,lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/blog`,    lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
    { url: `${BASE}/projects`,lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/about`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Fetch dynamic routes from API (graceful fallback on build)
  try {
    const [servicesRes, blogRes] = await Promise.all([
      fetch(`${apiBase}/api/v1/services?per_page=50`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/api/v1/blog?per_page=100`, { next: { revalidate: 3600 } }),
    ]);

    const dynamicRoutes: MetadataRoute.Sitemap = [];

    if (servicesRes.ok) {
      const { data } = await servicesRes.json();
      for (const s of (data ?? []) as { slug: string; updated_at: string }[]) {
        dynamicRoutes.push({
          url: `${BASE}/services/${s.slug}`,
          lastModified: new Date(s.updated_at),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }

    if (blogRes.ok) {
      const { data } = await blogRes.json();
      for (const p of (data ?? []) as { slug: string; updated_at: string }[]) {
        dynamicRoutes.push({
          url: `${BASE}/blog/${p.slug}`,
          lastModified: new Date(p.updated_at),
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }

    if (dynamicRoutes.length > 0) return [...staticRoutes, ...dynamicRoutes];
  } catch { /* api not available during build */ }

  return staticRoutes;
}
