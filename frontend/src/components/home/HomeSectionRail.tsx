"use client";

import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

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
  // No "Categories" entry: the lane switcher is the categories control and it
  // sits above this rail, so a chip pointing at it would scroll upward.
  { id: "popular", en: "Popular", bn: "জনপ্রিয়" },
  { id: "reviews", en: "Reviews", bn: "রিভিউ" },
  { id: "faq", en: "FAQ", bn: "প্রশ্ন" },
  { id: "contact", en: "Contact", bn: "যোগাযোগ" },
];

export default function HomeSectionRail() {
  const { lang } = useLanguageStore();
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  /*
   * Which section the reader is actually in. Without this the rail is a set of
   * links that never acknowledges where you are, which is worse than no rail:
   * it implies a position and then reports the wrong one.
   */
  useEffect(() => {
    const targets = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      // Top third of the viewport: the band a reader is actually looking at.
      { rootMargin: "-20% 0px -70% 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
            aria-current={active === s.id ? "true" : undefined}
            className={cn(
              "flex-shrink-0 my-1.5 min-h-[36px] flex items-center px-3.5 rounded-full text-sm font-semibold whitespace-nowrap border motion-safe:transition-colors",
              active === s.id
                ? "bg-[#14182b] text-[#f1f2f7] border-[#14182b]"
                : "border-gray-200 dark:border-white/10 text-muted hover:text-brand-600"
            )}
          >
            {lang === "bn" ? s.bn : s.en}
          </a>
        ))}
      </div>
    </nav>
  );
}
