import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/tokens";

const BASE = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/services`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/projects`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/checkout`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/track`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";

  try {
    const [servicesRes, blogRes, productsRes] = await Promise.all([
      fetch(`${apiBase}/api/v1/services?per_page=50`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/api/v1/blog?per_page=100`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/api/v1/products?per_page=100`, { next: { revalidate: 3600 } }),
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

    if (productsRes.ok) {
      const { data } = await productsRes.json();
      for (const p of (data ?? []) as { slug: string; updated_at?: string }[]) {
        dynamicRoutes.push({
          url: `${BASE}/products/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly",
          priority: 0.75,
        });
      }
    }

    if (dynamicRoutes.length > 0) return [...staticRoutes, ...dynamicRoutes];
  } catch { /* api not available during build */ }

  return staticRoutes;
}
