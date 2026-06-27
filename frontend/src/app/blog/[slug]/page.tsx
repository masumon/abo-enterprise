import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import type { BlogPost } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  const url = post.canonical_url ?? `https://aboenterprise.vercel.app/blog/${post.slug}`;
  const ogImg = post.og_image ?? post.featured_image_url;

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
    url: `https://aboenterprise.vercel.app/blog/${post.slug}`,
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
      url: "https://aboenterprise.vercel.app",
      logo: {
        "@type": "ImageObject",
        url: "https://aboenterprise.vercel.app/icons/icon-512.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://aboenterprise.vercel.app/blog/${post.slug}`,
    },
    ...(post.tags && post.tags.length > 0 ? { keywords: post.tags.join(", ") } : {}),
  };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen">
        {/* Hero */}
        {post.featured_image_url ? (
          <div className="w-full aspect-[2/1] max-h-[480px] overflow-hidden bg-gray-100">
            <img
              src={post.featured_image_url}
              alt={post.title_en}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="gradient-brand h-32" />
        )}

        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link href="/blog" className="hover:text-brand-600 transition-colors">
              Blog
            </Link>
            <span>/</span>
            {post.category && (
              <>
                <span className="capitalize">{post.category}</span>
                <span>/</span>
              </>
            )}
            <span className="text-gray-600 truncate max-w-xs">{post.title_en}</span>
          </nav>

          {/* Category */}
          {post.category && (
            <span className="inline-block px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full mb-4 capitalize">
              {post.category}
            </span>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
            {post.title_en}
          </h1>
          {post.title_bn && (
            <p className="text-xl text-gray-600 mb-4">{post.title_bn}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
            <span className="font-medium text-gray-600">{post.author_name}</span>
            <span>·</span>
            <time dateTime={post.published_at ?? post.created_at}>
              {formatDate(post.published_at ?? post.created_at)}
            </time>
            {post.tags && post.tags.length > 0 && (
              <>
                <span>·</span>
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content */}
          <article className="prose prose-gray max-w-none leading-relaxed whitespace-pre-line text-gray-700">
            {post.content_en}
          </article>

          {/* Bengali content */}
          {post.content_bn && (
            <article className="mt-10 prose prose-gray max-w-none leading-relaxed whitespace-pre-line text-gray-700 border-t border-gray-100 pt-8">
              {post.content_bn}
            </article>
          )}

          {/* Back link */}
          <div className="mt-12 pt-6 border-t border-gray-100">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
            >
              ← Back to Blog
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
