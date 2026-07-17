"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";

interface BlogPostMetaProps {
  authorName: string;
  dateStr?: string;
  tags?: string[];
}

function formatDate(dateStr: string | undefined, lang: "bn" | "en") {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPostMeta({ authorName, dateStr, tags }: BlogPostMetaProps) {
  const { lang } = useLanguageStore();

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-6 pb-6 border-b border-gray-100">
        <span className="font-medium text-gray-600">{authorName}</span>
        <span>·</span>
        <time dateTime={dateStr}>{formatDate(dateStr, lang)}</time>
        {tags && tags.length > 0 && (
          <>
            <span>·</span>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
        >
          {lang === "bn" ? "← ব্লগে ফিরে যান" : "← Back to Blog"}
        </Link>
      </div>
    </>
  );
}