"use client";

import { useState } from "react";
import { Printer, Languages } from "lucide-react";

interface Props {
  contentEn: string;
  contentBn?: string | null;
  titleEn: string;
  titleBn?: string | null;
}

export default function BlogPostActions({ contentEn, contentBn, titleEn, titleBn }: Props) {
  const hasBn = !!(contentBn?.trim());
  // Bangla-first: an article with a Bangla version opens in Bangla; the reader
  // can switch to English. English-only articles show English.
  const [lang, setLang] = useState<"en" | "bn">(hasBn ? "bn" : "en");

  const handlePrint = () => window.print();

  const content = lang === "bn" && hasBn ? contentBn! : contentEn;
  const title = lang === "bn" && titleBn ? titleBn : titleEn;

  return (
    <>
      {/* Title first — switches with language */}
      <h1
        className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-heading leading-tight tracking-tight mb-4"
        dir={lang === "bn" ? "auto" : "ltr"}
      >
        {title}
      </h1>

      {/* Action bar — hidden in print */}
      <div className="flex items-center gap-2 flex-wrap mb-6 print:hidden">
        {hasBn && (
          <button
            type="button"
            onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
            className="btn btn-brand btn-sm"
          >
            <Languages className="w-4 h-4" />
            {lang === "en" ? "বাংলায় পড়ুন" : "Read in English"}
          </button>
        )}
        <button type="button" onClick={handlePrint} className="btn btn-outline btn-sm">
          <Printer className="w-4 h-4" />
          {lang === "bn" ? "প্রিন্ট" : "Print"}
        </button>
      </div>

      {/* Content — switches with language. The typography plugin isn't
          installed, so styling stays token-based (theme-aware) rather than
          relying on `prose`. */}
      <article
        className="max-w-none whitespace-pre-line text-[15px] sm:text-base leading-[1.9] text-[var(--ink)]"
        dir={lang === "bn" ? "auto" : "ltr"}
      >
        {content}
      </article>
    </>
  );
}
