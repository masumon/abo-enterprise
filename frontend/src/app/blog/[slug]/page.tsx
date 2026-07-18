import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import type { BlogPost } from "@/types";

import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
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

        </div>
      </main>
    </>
  );
}
