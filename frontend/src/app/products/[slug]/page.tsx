import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Product } from "@/types";
import ProductDetailClient from "./ProductDetailClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as Product | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) {
    return { title: "Product Not Found | ABO Enterprise" };
  }

  const title = product.seo_title ?? `${product.name_en} | ABO Enterprise`;
  const description =
    product.seo_description ??
    product.description_en ??
    `Buy ${product.name_en} at the best price in Bangladesh. Fast delivery from ABO Enterprise, Sylhet.`;
  const url = product.canonical_url ?? `https://aboenterprise.vercel.app/products/${product.slug}`;
  const ogImg = product.og_image ?? product.image_url;

  return {
    title,
    description,
    keywords: product.seo_keywords ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ogImg ? [{ url: ogImg, alt: product.name_en, width: 800, height: 800 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImg ? [ogImg] : [],
    },
  };
}

function buildJsonLd(product: Product) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name_en,
    description: product.description_en ?? product.name_en,
    url: `https://aboenterprise.vercel.app/products/${product.slug}`,
    brand: {
      "@type": "Brand",
      name: "ABO Enterprise",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: product.price,
      availability:
        (product.stock_quantity ?? 1) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "ABO Enterprise",
        url: "https://aboenterprise.vercel.app",
      },
    },
  };

  if (product.image_url) jsonLd.image = [product.image_url];
  if (product.rating) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      bestRating: 5,
      worstRating: 1,
      ratingCount: 1,
    };
  }
  if (product.category) jsonLd.category = product.category;

  return jsonLd;
}

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await fetchProduct(params.slug);
  if (!product) notFound();

  const jsonLd = buildJsonLd(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
