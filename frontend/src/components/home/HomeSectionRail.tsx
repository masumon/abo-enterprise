"use client";

import { useLanguageStore } from "@/store/language";

/**
 * Screen 04 — the section rail. Even at eleven sections the homepage is longer
 * than a phone screen by a wide margin, and the visitor who wants the FAQ or
 * the contact details has no way to get there but the scrollbar.
 *
 * Anchors only: every target is a section already on this page, so the rail
 * cannot point at something that is not rendered, and it costs no JavaScript
 * beyond this component. Sticky under the header, one 44px row.
 */
const SECTIONS = [
  { id: "categories", en: "Categories", bn: "ক্যাটাগরি" },
  { id: "popular", en: "Popular", bn: "জনপ্রিয়" },
  { id: "reviews", en: "Reviews", bn: "রিভিউ" },
  { id: "faq", en: "FAQ", bn: "প্রশ্ন" },
  { id: "contact", en: "Contact", bn: "যোগাযোগ" },
];

export default function HomeSectionRail() {
  const { lang } = useLanguageStore();

  return (
    <nav
      aria-label={lang === "bn" ? "পাতার অংশ" : "Page sections"}
      className="sticky top-[var(--navbar-offset)] z-30 bg-white/95 dark:bg-[var(--surface-card)]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/10"
    >
      <div className="container mx-auto px-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex-shrink-0 min-h-[44px] flex items-center px-3 text-sm font-semibold text-muted hover:text-brand-600 whitespace-nowrap"
          >
            {lang === "bn" ? s.bn : s.en}
          </a>
        ))}
      </div>
    </nav>
  );
}
