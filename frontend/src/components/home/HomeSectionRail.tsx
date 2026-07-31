"use client";

import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "popular", en: "Popular", bn: "জনপ্রিয়" },
  { id: "deals", en: "Deals", bn: "অফার" },
  { id: "categories", en: "Categories", bn: "বিভাগ" },
  { id: "reviews", en: "Reviews", bn: "রিভিউ" },
  { id: "faq", en: "FAQ", bn: "প্রশ্ন" },
  { id: "contact", en: "Contact", bn: "যোগাযোগ" },
];

export default function HomeSectionRail() {
  const { lang } = useLanguageStore();
  const [active, setActive] = useState<string>(SECTIONS[0].id);

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
      { rootMargin: "-20% 0px -70% 0px" }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label={lang === "bn" ? "পাতার অংশ" : "Page sections"}
      className="sticky top-[var(--navbar-offset)] z-30 bg-white/95 dark:bg-[var(--surface-card)]/95 backdrop-blur-sm border-y border-[var(--line)]"
    >
      <div className="flex gap-[5px] px-3 overflow-x-auto scrollbar-hide py-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "true" : undefined}
            className={cn(
              "flex-none text-[11px] py-1.5 px-[11px] rounded-full border whitespace-nowrap motion-safe:transition-colors",
              active === s.id
                ? "bg-[var(--ink)] text-[var(--ground,#f1f2f7)] border-[var(--ink)] font-semibold"
                : "border-[var(--line)] text-[var(--ink-muted)] bg-white dark:bg-[var(--surface)]"
            )}
          >
            {lang === "bn" ? s.bn : s.en}
          </a>
        ))}
      </div>
    </nav>
  );
}
