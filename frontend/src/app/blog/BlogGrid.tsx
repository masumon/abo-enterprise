"use client";

import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/types";
import { useLanguageStore } from "@/store/language";
import { Newspaper } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

interface Props {
  posts: BlogPost[];
  page: number;
  totalPages: number;
}

function formatDate(dateStr?: string, lang?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogGrid({ posts, page, totalPages }: Props) {
  const { lang } = useLanguageStore();

  if (posts.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-semibold mb-2">
          {lang === "bn" ? "এখনো কোনো পোস্ট নেই" : "No posts yet"}
        </p>
        <p className="text-sm">
          {lang === "bn" ? "শীঘ্রই নতুন আর্টিকেল আসছে।" : "Check back soon for articles and updates."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {posts.map((post, i) => {
          const title = lang === "bn" && post.title_bn ? post.title_bn : post.title_en;
          const excerpt = lang === "bn" && post.excerpt_bn ? post.excerpt_bn : post.excerpt_en;
          return (
            <Reveal key={post.id} as="div" delay={(i % 6) * 60} className="h-full">
            <Link
              href={`/blog/${post.slug}`}
              className="group flex flex-col h-full enterprise-card overflow-hidden shadow-sm hover:shadow-md hover:border-brand-200 dark:hover:border-brand-500/30 transition-all"
            >
              <div className="relative aspect-video overflow-hidden">
                {post.featured_image_url?.trim() ? (
                  <div className="absolute inset-0 bg-gray-100 dark:bg-[#141930] flex items-center justify-center">
                    <Image
                      src={post.featured_image_url}
                      alt={title}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ) : (
                  /* Branded navy→gold panel instead of a stock image — same
                     treatment as the service/software/project cards. */
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center overflow-hidden">
                    <span aria-hidden className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-accent-500/15 blur-2xl" />
                    <span aria-hidden className="absolute -bottom-5 -left-3 text-white/[0.06] font-black text-[6.5rem] leading-none select-none">{title.charAt(0)}</span>
                    <span className="relative w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                      <Newspaper className="w-7 h-7 text-accent-400" aria-hidden />
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 p-5">
                {post.category && (
                  <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
                    {post.category}
                  </span>
                )}
                <h2 className="font-bold text-heading text-base leading-snug mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors line-clamp-2">
                  {title}
                </h2>
                {excerpt && (
                  <p className="text-sm text-muted line-clamp-3 flex-1">{excerpt}</p>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-white/10 text-xs text-muted">
                  <span>{post.author_name}</span>
                  <span>{formatDate(post.published_at ?? post.created_at, lang)}</span>
                </div>
              </div>
            </Link>
            </Reveal>
          );
        })}
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Link href={`/blog?page=${page - 1}`} className="btn btn-outline btn-sm">
              {lang === "bn" ? "আগে" : "Previous"}
            </Link>
          )}
          <span className="flex items-center px-3 text-sm text-gray-500">
            {lang === "bn" ? `পৃষ্ঠা ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          {page < totalPages && (
            <Link href={`/blog?page=${page + 1}`} className="btn btn-outline btn-sm">
              {lang === "bn" ? "পরে" : "Next"}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
