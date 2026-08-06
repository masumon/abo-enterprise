import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import type { BlogPost, Product } from "@/types";

import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import { fetchPublicSettings, settingValue } from "@/lib/serverSettings";
import BlogProductRail from "@/components/blog/BlogProductRail";
import BlogPostActions from "./BlogPostActions";
import BlogPostBreadcrumb from "./BlogPostBreadcrumb";
import BlogPostMeta from "./BlogPostMeta";
import { jsonLdString } from "@/lib/metadata";

const API_BASE = getApiBaseUrl();

async function fetchPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as BlogPost | null;
  } catch {
    return null;
  }
}

/**
 * GAP-17 — products for the in-article rail. Tried against the post's category
 * first so the rail is topical when it can be; an unfiltered page is the
 * fallback, and the label downstream says which one the reader is looking at.
 * Every failure path returns an empty list, which renders nothing — the
 * article must never depend on the catalogue being reachable.
 */
async function fetchRailProducts(
  slug: string,
  category?: string | null
): Promise<{ products: Product[]; matched: boolean }> {
  const get = async (qs: string): Promise<Product[]> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/products?${qs}`, {
        next: { revalidate: 300 },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as Product[];
    } catch {
      return [];
    }
  };

  // 1) Products an admin explicitly linked to THIS post win — they are the
  //    hand-picked "related products" and are always the most topical.
  try {
    const res = await fetch(`${API_BASE}/api/v1/blog/${encodeURIComponent(slug)}/products`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const linked = ((await res.json()).data ?? []) as Product[];
      if (linked.length > 0) return { products: linked.slice(0, 3), matched: true };
    }
  } catch {
    /* fall through to category match */
  }

  // 2) No explicit links — fall back to a category text-match, then to any
  //    products, so the rail still has something to show.
  if (category) {
    const matchedProducts = await get(
      `page=1&per_page=3&search=${encodeURIComponent(category)}`
    );
    if (matchedProducts.length > 0) return { products: matchedProducts, matched: true };
  }
  return { products: await get("page=1&per_page=3"), matched: false };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await fetchPost(params.slug);
  if (!post) return { title: "Post Not Found | ABO Enterprise" };

  const title = post.seo_title ?? `${post.title_en} | ABO Enterprise Blog`;
  const description = post.seo_description ?? post.excerpt_en ?? post.content_en.slice(0, 160);
  const url = post.canonical_url ?? `${SITE_URL}/blog/${post.slug}`;
  const ogImg = post.og_image ?? post.featured_image_url ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    keywords: post.seo_keywords ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.published_at,
      authors: [post.author_name],
      images: ogImg ? [{ url: ogImg, alt: post.title_en }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImg ? [ogImg] : [],
    },
  };
}

function buildArticleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title_en,
    description: post.excerpt_en ?? post.content_en.slice(0, 160),
    url: `${SITE_URL}/blog/${post.slug}`,
    image: post.featured_image_url ? [post.featured_image_url] : undefined,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at ?? post.published_at ?? post.created_at,
    author: {
      "@type": "Person",
      name: post.author_name,
    },
    publisher: {
      "@type": "Organization",
      name: "ABO Enterprise",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await fetchPost(params.slug);
  if (!post) notFound();

  // Admin → Products has a toggle for this rail; default on so existing
  // articles keep their current behavior until an admin turns it off.
  const settings = await fetchPublicSettings();
  const railEnabled = settingValue(settings, "feature_blog_product_rail", "true") !== "false";
  const rail = railEnabled
    ? await fetchRailProducts(params.slug, post.category)
    : { products: [], matched: false };
  const jsonLd = buildArticleJsonLd(post);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <main className="min-h-screen">
        {/* Hero */}
        {post.featured_image_url ? (
          <div className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900 h-[min(480px,50vh)]">
            <Image
              src={post.featured_image_url}
              alt={post.title_en}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        ) : (
          <div className="gradient-brand h-32" />
        )}

        <div className="max-w-3xl mx-auto px-4 py-10">
          <BlogPostBreadcrumb category={post.category} title={post.title_en} />

          {/* Category */}
          {post.category && (
            <span className="inline-block px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full mb-4 capitalize">
              {post.category}
            </span>
          )}

          <BlogPostMeta
            authorName={post.author_name}
            dateStr={post.published_at ?? post.created_at}
            tags={post.tags}
          />

          {/* Title + Content + Print/Translate (client interactive) */}
          <BlogPostActions
            titleEn={post.title_en}
            titleBn={post.title_bn ?? null}
            contentEn={post.content_en}
            contentBn={post.content_bn ?? null}
          />

          <BlogProductRail products={rail.products} matched={rail.matched} />
        </div>
      </main>
    </>
  );
}
