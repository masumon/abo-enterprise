import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ComponentType } from "react";
import type { Category, Service, Subcategory } from "@/types";
import ServiceDetailClient from "./ServiceDetailClient";
import CategoryBrowseClient from "@/components/services/CategoryBrowseClient";
import PrintingServicePage from "@/components/services/legacy/PrintingServicePage";
import LegalServicePage from "@/components/services/legacy/LegalServicePage";
import SoftwareServicePage from "@/components/services/legacy/SoftwareServicePage";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import { jsonLdString, pageMeta } from "@/lib/metadata";
import { fetchWithRetry } from "@/lib/fetchRetry";

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
 *
 * printing / legal / software used to be standalone static routes shadowing
 * this resolver. They now resolve through the same DB-first pipeline; the
 * original booking pages render only as the final fallback, so the moment the
 * admin publishes a matching service or category, the canonical taxonomy page
 * takes over at the exact same URL — one route system, no redirects needed.
 */
const LEGACY_STATIC_PAGES: Record<string, { Component: ComponentType; title: string; description: string }> = {
  printing: {
    Component: PrintingServicePage,
    title: "Printing Services",
    description: "Professional printing — business cards, banners, brochures and more in Sylhet.",
  },
  legal: {
    Component: LegalServicePage,
    title: "Legal Assistance",
    description: "GD filing, FIR applications, legal documents and government assistance in Bangladesh.",
  },
  software: {
    Component: SoftwareServicePage,
    title: "Software Development",
    description: "Web, mobile, AI and enterprise software development by ABO Enterprise.",
  },
};

interface Envelope<T> {
  data: T | null;
  meta?: { total?: number };
}

async function fetchEnvelope<T>(url: string): Promise<Envelope<T>> {
  try {
    // fetchWithRetry absorbs transient 5xx/cold-starts so a blip never turns
    // a valid URL into a hard 404 (which crawlers may deindex).
    const res = await fetchWithRetry(url, { next: { revalidate: 60 } });
    if (!res.ok) return { data: null };
    return (await res.json()) as Envelope<T>;
  } catch {
    return { data: null };
  }
}

const fetchService = async (slug: string) =>
  (await fetchEnvelope<Service>(`${API_BASE}/api/v1/services/${encodeURIComponent(slug)}`)).data;

/** Active, service-applicable category — anything else is not publicly routable. */
async function fetchServiceCategory(slug: string): Promise<Category | null> {
  const cat = (await fetchEnvelope<Category>(`${API_BASE}/api/v1/categories/${encodeURIComponent(slug)}`)).data;
  if (!cat) return null;
  if (cat.is_active === false) return null;
  if (!(cat.applies_to ?? []).includes("service")) return null;
  return cat;
}

/**
 * Walk the remaining URL segments down the node's children (unlimited depth).
 * Returns the root-first trail, or null when any segment doesn't resolve.
 */
function resolveTrail(category: Category, rest: string[]): Subcategory[] | null {
  // The single-node endpoint ships the ancestors, so short URLs to deep
  // nodes still render with a complete breadcrumb trail.
  const trail: Subcategory[] = [...(category.ancestors ?? []), category as unknown as Subcategory];
  let node: Subcategory = category as unknown as Subcategory;
  for (const seg of rest) {
    const next = (node.subcategories ?? []).find((s) => s.slug === seg && s.is_active !== false);
    if (!next) return null;
    trail.push(next);
    node = next;
  }
  return trail;
}

async function fetchTaxonomyServices(
  nodeSlug: string
): Promise<{ services: Service[]; total: number }> {
  const params = new URLSearchParams({ page: "1", per_page: "12", category_slug: nodeSlug });
  const env = await fetchEnvelope<Service[]>(`${API_BASE}/api/v1/services?${params}`);
  const services = env.data ?? [];
  return { services, total: env.meta?.total ?? services.length };
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
    // Both lookups are independent probes on the same slug — run them together.
    const [service, category] = await Promise.all([
      fetchService(segments[0]),
      fetchServiceCategory(segments[0]),
    ]);
    if (service) return serviceMetadata(service);
    if (category) {
      const title = `${category.name_en} Services | ABO Enterprise`;
      const description =
        category.description_en ??
        `${category.name_en} services by ABO Enterprise, Bangladesh.`;
      // Canonical is always the full tree path, even when a deep node is
      // reached by its short slug.
      const path = [...(category.ancestors ?? []).map((a) => a.slug), category.slug].join("/");
      const url = `${SITE_URL}/services/${path}`;
      return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: "website" } };
    }
    const legacy = LEGACY_STATIC_PAGES[segments[0]];
    if (legacy) return pageMeta(legacy.title, legacy.description, `/services/${segments[0]}`);
  }

  if (segments.length >= 2) {
    const category = await fetchServiceCategory(segments[0]);
    const trail = category ? resolveTrail(category, segments.slice(1)) : null;
    if (trail) {
      const node = trail[trail.length - 1];
      const parent = trail.length > 1 ? trail[trail.length - 2] : null;
      const title = parent
        ? `${node.name_en} — ${parent.name_en} | ABO Enterprise`
        : `${node.name_en} Services | ABO Enterprise`;
      const description =
        node.description_en ?? `${node.name_en} services by ABO Enterprise, Bangladesh.`;
      const url = `${SITE_URL}/services/${trail.map((n) => n.slug).join("/")}`;
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
    const [service, category] = await Promise.all([
      fetchService(segments[0]),
      fetchServiceCategory(segments[0]),
    ]);

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

    // /services/{categorySlug} — category landing page (trail includes any
    // ancestors so deep nodes reached by short slug still get breadcrumbs).
    if (category) {
      const trail = resolveTrail(category, [])!;
      const { services, total } = await fetchTaxonomyServices(category.slug);
      return <CategoryBrowseClient trail={trail} initialServices={services} initialTotal={total} />;
    }

    // Final fallback: the original printing/legal/software booking pages keep
    // serving their URLs until the taxonomy covers those slugs.
    const legacy = LEGACY_STATIC_PAGES[segments[0]];
    if (legacy) {
      const Legacy = legacy.Component;
      return <Legacy />;
    }

    notFound();
  }

  // /services/{category}/{child}/... — any depth down the tree.
  const category = await fetchServiceCategory(segments[0]);
  const trail = category ? resolveTrail(category, segments.slice(1)) : null;
  if (trail) {
    const node = trail[trail.length - 1];
    const { services, total } = await fetchTaxonomyServices(node.slug);
    return <CategoryBrowseClient trail={trail} initialServices={services} initialTotal={total} />;
  }
  notFound();
}
