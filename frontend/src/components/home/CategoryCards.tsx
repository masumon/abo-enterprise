"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Wrench, Laptop, ArrowRight, type LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_QUICK_CATEGORIES_KEY, QUICK_CATEGORY_DEFAULTS, getQuickCategories, type CmsQuickCategory } from "@/lib/cmsContent";

/** Icon names usable from the admin JSON (site_quick_categories_json). */
const ICONS: Record<string, LucideIcon> = {
  "shopping-bag": ShoppingBag,
  wrench: Wrench,
  laptop: Laptop,
};

/** Cosmetic gradient per tile — cycles by position since the CMS JSON only
 * carries an icon name, not a gradient. */
const GRADIENTS = [
  "from-accent-500 to-accent-600",
  "from-brand-500 to-brand-700",
  "from-brand-400 to-accent-500",
];

/** Per-tile tint + call-to-action colour, in step with GRADIENTS. */
const TINTS = [
  { card: "from-accent-50 to-white border-accent-200/70 dark:from-accent-500/10 dark:to-white/[0.02] dark:border-accent-500/25", cta: "bg-accent-500 text-white" },
  { card: "from-brand-50 to-white border-brand-200/70 dark:from-brand-500/10 dark:to-white/[0.02] dark:border-brand-500/25", cta: "bg-brand-600 text-white" },
  { card: "from-violet-50 to-white border-violet-200/70 dark:from-violet-500/10 dark:to-white/[0.02] dark:border-violet-500/25", cta: "bg-gradient-to-r from-brand-500 to-accent-500 text-white" },
];

const FALLBACK = QUICK_CATEGORY_DEFAULTS;

export default function CategoryCards() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_QUICK_CATEGORIES_KEY]);
  const categories = getQuickCategories(settings, FALLBACK);
  const hasPhotos = categories.some((c) => !!c.image_url?.trim());

  return (
    <section className="pt-2 pb-4 sm:py-6 bg-white dark:bg-[var(--surface)] lg:bg-transparent lg:dark:bg-transparent lg:-mt-14 lg:py-0 lg:pb-6 relative z-10">
      <div className="container mx-auto px-4 xl:px-6">
        <div className={`grid ${categories.length % 3 === 0 ? "grid-cols-3" : "grid-cols-2"} ${categories.length <= 3 ? "sm:grid-cols-3 max-w-4xl lg:max-w-none mx-auto" : categories.length === 4 ? "sm:grid-cols-4 max-w-5xl lg:max-w-none mx-auto" : "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"} gap-2.5 sm:gap-4 py-1 sm:py-3`}>
          {categories.map((cat, i) => {
            const Icon = ICONS[cat.icon ?? ""] ?? ShoppingBag;
            const gradient = GRADIENTS[i % GRADIENTS.length];
            const tint = TINTS[i % TINTS.length];
            const label = lang === "bn" ? cat.label_bn || cat.label_en : cat.label_en || cat.label_bn;
            const blurb = lang === "bn" ? cat.desc_bn || cat.desc_en : cat.desc_en || cat.desc_bn;
            if (hasPhotos) {
              // Photo layout (admin uploaded a real photo for at least one card): the picture fills
              // the card, a dark fade at the bottom keeps the white text readable. Cards without a
              // photo use the brand gradient with a large faint icon, so all three still match.
              return (
                <Link key={`${cat.href}-${i}`} href={cat.href}
                  className="group relative block min-w-0 aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-brand-500/20 hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
                  {cat.image_url ? (
                    <Image src={cat.image_url} alt="" fill sizes="(max-width: 640px) 34vw, 320px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span aria-hidden className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <Icon className="w-16 h-16 sm:w-20 sm:h-20 text-white/25" strokeWidth={1.5} />
                    </span>
                  )}
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4 flex flex-col items-start text-left gap-0.5 sm:gap-1">
                    <span className="text-sm sm:text-lg font-extrabold text-white leading-tight drop-shadow">{label}</span>
                    <span className="hidden sm:block text-xs text-white/85 leading-snug line-clamp-2">{blurb}</span>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/95 text-gray-900 px-2.5 py-1 text-[10px] sm:text-xs font-bold shadow-sm transition-transform group-hover:translate-x-0.5">
                      {lang === "bn" ? "দেখুন" : "Explore"}
                      <ArrowRight className="w-3 h-3" aria-hidden />
                    </span>
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={`${cat.href}-${i}`}
                href={cat.href}
                className={`group relative flex min-w-0 flex-col items-center text-center gap-1.5 sm:gap-2 px-1.5 py-3 sm:px-4 sm:py-5 lg:py-6 rounded-2xl border bg-gradient-to-b ${tint.card} shadow-sm hover:shadow-xl hover:shadow-brand-500/15 hover:-translate-y-1 active:scale-[0.97] transition-all duration-200 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`}
              >
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-transparent via-white/40 to-transparent dark:via-white/5 transition-opacity duration-300" />
                <span className={`relative w-12 h-12 sm:w-14 sm:h-14 lg:w-[72px] lg:h-[72px] rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-brand-500/25 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-9 lg:h-9 text-white" strokeWidth={2} aria-hidden />
                </span>
                <span className="relative text-sm sm:text-base lg:text-2xl font-extrabold text-heading leading-tight tracking-tight">{label}</span>
                <span className="relative text-[10px] sm:text-xs lg:text-sm text-[var(--ink-muted)] leading-snug line-clamp-2 group-hover:text-[var(--ink)] transition-colors">
                  {blurb}
                </span>
                <span className={`relative mt-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs font-bold shadow-sm ${tint.cta} transition-transform group-hover:translate-x-0.5`}>
                  {lang === "bn" ? "দেখুন" : "Explore"}
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
