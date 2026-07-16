import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";

const BASE = SITE_URL;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/products", priority: 0.9, changeFrequency: "daily" },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" },
  { path: "/services/printing", priority: 0.85, changeFrequency: "weekly" },
  { path: "/services/legal", priority: 0.85, changeFrequency: "weekly" },
  { path: "/services/software", priority: 0.85, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.8, changeFrequency: "daily" },
  { path: "/projects", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.65, changeFrequency: "monthly" },
  { path: "/gallery", priority: 0.6, changeFrequency: "monthly" },
  { path: "/testimonials", priority: 0.65, changeFrequency: "weekly" },
  { path: "/career", priority: 0.55, changeFrequency: "monthly" },
  { path: "/shipping", priority: 0.5, changeFrequency: "monthly" },
  { path: "/legal/privacy", priority: 0.4, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.4, changeFrequency: "yearly" },
  { path: "/legal/refund", priority: 0.4, changeFrequency: "yearly" },
  { path: "/track", priority: 0.5, changeFrequency: "monthly" },
  { path: "/book", priority: 0.7, changeFrequency: "weekly" },
  // Account, cart/checkout, compare and internal search pages are deliberately
  // excluded — they carry noindex metadata and have no search-landing value.
];

/** These /services/* URLs are already listed in STATIC_PATHS above (they
 * resolve via the catch-all with a legacy fallback) — skip matching dynamic
 * service slugs so each URL is listed exactly once. */
const STATIC_SERVICE_SLUGS = new Set(["printing", "legal", "software"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const apiBase = getApiBaseUrl();

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
        if (STATIC_SERVICE_SLUGS.has(s.slug)) continue;
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
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.75,
        });
      }
    }

    if (dynamicRoutes.length > 0) return [...staticRoutes, ...dynamicRoutes];
  } catch { /* api not available during build */ }

  return staticRoutes;
}
