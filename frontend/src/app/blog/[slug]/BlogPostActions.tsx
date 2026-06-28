"use client";

import { useState } from "react";
import { Printer, Globe } from "lucide-react";

interface Props {
  contentEn: string;
  contentBn?: string | null;
  titleEn: string;
  titleBn?: string | null;
}

export default function BlogPostActions({ contentEn, contentBn, titleEn, titleBn }: Props) {
  const [lang, setLang] = useState<"en" | "bn">("en");
  const hasBn = !!(contentBn?.trim());

  const handlePrint = () => window.print();

  const content = lang === "bn" && hasBn ? contentBn! : contentEn;
  const title   = lang === "bn" && titleBn ? titleBn : titleEn;

  return (
    <>
      {/* Action buttons — shown in article, hidden in print */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>

        {hasBn && (
          <button
            onClick={() => setLang(l => l === "en" ? "bn" : "en")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "বাংলায় পড়ুন" : "Read in English"}
          </button>
        )}
      </div>

      {/* Title — switches with language */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4 mt-4">
        {title}
      </h1>

      {/* Content — switches with language */}
      <article
        className="prose prose-gray max-w-none leading-relaxed whitespace-pre-line text-gray-700"
        dir={lang === "bn" ? "auto" : "ltr"}
      >
        {content}
      </article>
    </>
  );
}
