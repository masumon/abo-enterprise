"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

export interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  sections: LegalSection[];
  showTitle?: boolean;
}

export default function LegalPageLayout({ title, sections, showTitle = true }: LegalPageLayoutProps) {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
        <aside className="hidden lg:block sticky top-[calc(var(--navbar-offset)+1.5rem)]">
          <nav aria-label={isBn ? "বিষয়সূচি" : "Table of contents"} className="enterprise-card p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 px-2">{isBn ? "বিষয়সূচি" : "Contents"}</p>
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm transition-colors",
                  activeId === s.id
                    ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-medium"
                    : "text-muted hover:text-heading hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="enterprise-card p-6 md:p-10">
          <nav aria-label={isBn ? "মোবাইল বিষয়সূচি" : "Mobile table of contents"} className="lg:hidden mb-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-full text-xs border transition-colors",
                    activeId === s.id
                      ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700"
                      : "text-muted border-gray-200 dark:border-white/10"
                  )}
                >
                  {s.title}
                </a>
              ))}
            </div>
          </nav>
          {showTitle && <h1 className="text-3xl font-bold text-heading mb-8">{title}</h1>}
          <div className="prose prose-sm max-w-none space-y-8 text-muted">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="text-lg font-bold text-heading mb-3">{s.title}</h2>
                <div className="leading-relaxed space-y-3">{s.content}</div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
