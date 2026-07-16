import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Category, Service, Subcategory } from "@/types";
import ServiceDetailClient from "./ServiceDetailClient";
import CategoryBrowseClient from "@/components/services/CategoryBrowseClient";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import { jsonLdString } from "@/lib/metadata";

const API_BASE = getApiBaseUrl();

/**
 * Catch-all resolver for the nested service routes:
 *   /services/{serviceSlug}                       → service detail (legacy URLs unchanged)
 *   /services/{categorySlug}                      → category landing (subcategories + services)
 *   /services/{categorySlug}/{subCategorySlug}    → subcategory service listing
 *
 * A single segment is resolved as a service slug FIRST so every pre-existing
 * service URL keeps working exactly as before; only when no service matches
 * do we try the taxonomy.
 */

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as T | null;
  } catch {
    return null;
  }
}

const fetchService = (slug: string) =>
  fetchJson<Service>(`${API_BASE}/api/v1/services/${encodeURIComponent(slug)}`);

const fetchCategory = (slug: string) =>
  fetchJson<Category>(`${API_BASE}/api/v1/categories/${encodeURIComponent(slug)}`);

const fetchSubcategory = (categorySlug: string, subSlug: string) =>
  fetchJson<Subcategory>(
    `${API_BASE}/api/v1/categories/${encodeURIComponent(categorySlug)}/subcategories/${encodeURIComponent(subSlug)}`
  );

async function fetchTaxonomyServices(
  categorySlug: string,
  subcategorySlug?: string
): Promise<{ services: Service[]; total: number }> {
  const params = new URLSearchParams({ page: "1", per_page: "12", category_slug: categorySlug });
  if (subcategorySlug) params.set("subcategory_slug", subcategorySlug);
  try {
    const res = await fetch(`${API_BASE}/api/v1/services?${params}`, { next: { revalidate: 60 } });
    if (!res.ok) return { services: [], total: 0 };
    const json = await res.json();
    const services = (json.data ?? []) as Service[];
    return { services, total: json.meta?.total ?? services.length };
  } catch {
    return { services: [], total: 0 };
  }
}

interface PageParams {
  segments: string[];
}

function serviceMetadata(service: Service): Metadata {
  const title = service.seo_title ?? `${service.name_en} | ABO Enterprise`;
  const description =
    service.seo_description ??
    service.short_description_en ??
    service.description_en ??
    `Professional ${service.name_en} service by ABO Enterprise, Bangladesh.`;
  const url = service.canonical_url ?? `${SITE_URL}/services/${service.slug}`;
  const ogImg = service.og_image ?? service.featured_image_url ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    keywords: service.seo_keywords ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ogImg ? [{ url: ogImg, alt: service.name_en }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImg ? [ogImg] : [],
    },
  };
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const segments = params.segments ?? [];

  if (segments.length === 1) {
    const service = await fetchService(segments[0]);
    if (service) return serviceMetadata(service);
    const category = await fetchCategory(segments[0]);
    if (category) {
      const title = `${category.name_en} Services | ABO Enterprise`;
      const description =
        category.description_en ??
        `${category.name_en} services by ABO Enterprise, Bangladesh.`;
      const url = `${SITE_URL}/services/${category.slug}`;
      return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
    }
  }

  if (segments.length === 2) {
    const sub = await fetchSubcategory(segments[0], segments[1]);
    if (sub) {
      const catName = sub.category?.name_en ?? segments[0];
      const title = `${sub.name_en} — ${catName} | ABO Enterprise`;
      const description =
        sub.description_en ?? `${sub.name_en} (${catName}) services by ABO Enterprise, Bangladesh.`;
      const url = `${SITE_URL}/services/${segments[0]}/${segments[1]}`;
      return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
    }
  }

  return { title: "Service Not Found | ABO Enterprise" };
}

function buildJsonLd(service: Service) {
  const priceSpec: Record<string, unknown> = { "@type": "PriceSpecification" };
  if (service.pricing_type === "fixed" && service.base_price) {
    priceSpec.price = service.base_price;
    priceSpec.priceCurrency = "BDT";
  } else if (service.min_price && service.max_price) {
    priceSpec.minPrice = service.min_price;
    priceSpec.maxPrice = service.max_price;
    priceSpec.priceCurrency = "BDT";
  }

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name_en,
    description:
      service.description_en ??
      service.short_description_en ??
      service.name_en,
    url: `${SITE_URL}/services/${service.slug}`,
    image: service.featured_image_url ?? undefined,
    provider: {
      "@type": "Organization",
      name: "ABO Enterprise",
      url: SITE_URL,
      telephone: "+8801825007977",
      address: {
        "@type": "PostalAddress",
        addressCountry: "BD",
      },
    },
    areaServed: {
      "@type": "Country",
      name: "Bangladesh",
    },
    ...(Object.keys(priceSpec).length > 1 ? { offers: priceSpec } : {}),
    ...(service.tags && service.tags.length > 0
      ? { keywords: service.tags.join(", ") }
      : {}),
  };
}

export default async function ServicesCatchAllPage({ params }: { params: PageParams }) {
  const segments = params.segments ?? [];

  // /services/{serviceSlug} — service detail wins (legacy behaviour).
  if (segments.length === 1) {
    const service = await fetchService(segments[0]);
    if (service) {
      const jsonLd = buildJsonLd(service);
      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
          />
          <ServiceDetailClient service={service} />
        </>
      );
    }

    // /services/{categorySlug} — category landing page.
    const category = await fetchCategory(segments[0]);
    if (category) {
      const { services, total } = await fetchTaxonomyServices(category.slug);
      return (
        <CategoryBrowseClient
          category={category}
          initialServices={services}
          initialTotal={total}
        />
      );
    }

    notFound();
  }

  // /services/{categorySlug}/{subCategorySlug} — subcategory listing.
  if (segments.length === 2) {
    const sub = await fetchSubcategory(segments[0], segments[1]);
    if (sub) {
      // Full category fetch — the chip navigation needs the subcategory list.
      const category = await fetchCategory(segments[0]);
      if (category) {
        const { services, total } = await fetchTaxonomyServices(segments[0], segments[1]);
        return (
          <CategoryBrowseClient
            category={category}
            subcategory={sub}
            initialServices={services}
            initialTotal={total}
          />
        );
      }
    }
    notFound();
  }

  notFound();
}
