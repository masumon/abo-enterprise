import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PageRecord } from "@/lib/api";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/tokens";
import { getApiBaseUrl } from "@/lib/apiBase";
import { jsonLdString } from "@/lib/metadata";
import BlogPostActions from "@/app/blog/[slug]/BlogPostActions";

const API_BASE = getApiBaseUrl();

/**
 * Generic CMS page (Admin → Pages) — renders any published Page by slug.
 * Next.js resolves static routes (/products, /blog, /sumon, …) before this
 * dynamic catch, so it only ever receives requests for slugs that don't
 * match a real app route; pages.py additionally rejects those slugs at
 * creation time so an admin can't create an unreachable page.
 */
async function fetchPage(slug: string): Promise<PageRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as PageRecord | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await fetchPage(params.slug);
  if (!page) return { title: "Page Not Found | ABO Enterprise" };

  const title = page.seo_title ?? `${page.title_en} | ABO Enterprise`;
  const description = page.seo_description ?? page.content_en.slice(0, 160);
  const url = page.canonical_url ?? `${SITE_URL}/${page.slug}`;
  const ogImg = page.og_image ?? DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    keywords: page.seo_keywords ?? undefined,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: [{ url: ogImg, alt: page.title_en }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImg] },
  };
}

function buildPageJsonLd(page: PageRecord) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title_en,
    description: page.seo_description ?? page.content_en.slice(0, 160),
    url: `${SITE_URL}/${page.slug}`,
    datePublished: page.published_at ?? page.created_at,
    dateModified: page.updated_at,
  };
}

export default async function CmsPage({
  params,
}: {
  params: { slug: string };
}) {
  const page = await fetchPage(params.slug);
  if (!page) notFound();

  const jsonLd = buildPageJsonLd(page);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <main className="min-h-screen page-surface">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <BlogPostActions
            titleEn={page.title_en}
            titleBn={page.title_bn}
            contentEn={page.content_en}
            contentBn={page.content_bn}
          />
        </div>
      </main>
    </>
  );
}
