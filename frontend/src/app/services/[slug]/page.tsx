import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Service } from "@/types";
import ServiceDetailClient from "./ServiceDetailClient";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import { jsonLdString } from "@/lib/metadata";

const API_BASE = getApiBaseUrl();

async function fetchService(slug: string): Promise<Service | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/services/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as Service | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const service = await fetchService(params.slug);
  if (!service) {
    return { title: "Service Not Found | ABO Enterprise" };
  }

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

export default async function ServiceDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const service = await fetchService(params.slug);
  if (!service) notFound();

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
