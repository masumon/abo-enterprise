"use client";

import Link from "next/link";
import { ShoppingBag, Wrench, Laptop, ArrowRight, type LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_QUICK_CATEGORIES_KEY, getQuickCategories, type CmsQuickCategory } from "@/lib/cmsContent";

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

const FALLBACK: CmsQuickCategory[] = [
  {
    icon: "shopping-bag",
    label_en: "Shop", label_bn: "দোকান",
    desc_en: "Accessories, gadgets & electronics", desc_bn: "এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স",
    href: "/products",
  },
  {
    icon: "wrench",
    label_en: "Services", label_bn: "সেবা",
    desc_en: "Passport, NID, printing, repairs", desc_bn: "পাসপোর্ট, NID, প্রিন্টিং, সার্ভিসিং",
    href: "/services",
  },
  {
    icon: "laptop",
    label_en: "Software", label_bn: "সফটওয়্যার",
    desc_en: "POS, ERP, AI & custom software", desc_bn: "POS, ERP, AI ও কাস্টম সফটওয়্যার",
    href: "/projects",
  },
];

export default function CategoryCards() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_QUICK_CATEGORIES_KEY]);
  const categories = getQuickCategories(settings, FALLBACK);

  return (
    <section className="pt-2 pb-4 sm:py-6 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className={`grid ${categories.length % 3 === 0 ? "grid-cols-3" : "grid-cols-2"} ${categories.length <= 3 ? "sm:grid-cols-3 max-w-4xl mx-auto" : categories.length === 4 ? "sm:grid-cols-4 max-w-5xl mx-auto" : "sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"} gap-2.5 sm:gap-4 py-1 sm:py-3`}>
          {categories.map((cat, i) => {
            const Icon = ICONS[cat.icon ?? ""] ?? ShoppingBag;
            const gradient = GRADIENTS[i % GRADIENTS.length];
            const tint = TINTS[i % TINTS.length];
            const label = lang === "bn" ? cat.label_bn || cat.label_en : cat.label_en || cat.label_bn;
            const blurb = lang === "bn" ? cat.desc_bn || cat.desc_en : cat.desc_en || cat.desc_bn;
            return (
              <Link
                key={`${cat.href}-${i}`}
                href={cat.href}
                className={`group relative flex min-w-0 flex-col items-center text-center gap-1.5 sm:gap-2 px-1.5 py-3 sm:px-4 sm:py-5 rounded-2xl border bg-gradient-to-b ${tint.card} shadow-sm hover:shadow-xl hover:shadow-brand-500/15 hover:-translate-y-1 active:scale-[0.97] transition-all duration-200 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`}
              >
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-transparent via-white/40 to-transparent dark:via-white/5 transition-opacity duration-300" />
                <span className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-brand-500/25 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} aria-hidden />
                </span>
                <span className="relative text-sm sm:text-base font-extrabold text-heading leading-tight tracking-tight">{label}</span>
                <span className="relative text-[10px] sm:text-xs text-[var(--ink-muted)] leading-snug line-clamp-2 group-hover:text-[var(--ink)] transition-colors">
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
