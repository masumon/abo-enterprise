import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Service } from "@/types";
import ServiceDetailClient from "./ServiceDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

  const title = `${service.name_en} | ABO Enterprise`;
  const description =
    service.short_description_en ??
    service.description_en ??
    `Professional ${service.name_en} service by ABO Enterprise, Bangladesh.`;
  const url = `https://aboenterprise.vercel.app/services/${service.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: service.featured_image_url
        ? [{ url: service.featured_image_url, alt: service.name_en }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
    url: `https://aboenterprise.vercel.app/services/${service.slug}`,
    image: service.featured_image_url ?? undefined,
    provider: {
      "@type": "Organization",
      name: "ABO Enterprise",
      url: "https://aboenterprise.vercel.app",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceDetailClient service={service} />
    </>
  );
}
