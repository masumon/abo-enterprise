"use client";

import Link from "next/link";
import { ShoppingBag, Wrench, Laptop, type LucideIcon } from "lucide-react";
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
  "from-accent-500 to-amber-500",
  "from-brand-500 to-blue-500",
  "from-purple-500 to-fuchsia-500",
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
    <section className="py-6 sm:py-8 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {categories.map((cat, i) => {
            const Icon = ICONS[cat.icon ?? ""] ?? ShoppingBag;
            const gradient = GRADIENTS[i % GRADIENTS.length];
            const label = lang === "bn" ? cat.label_bn || cat.label_en : cat.label_en || cat.label_bn;
            const blurb = lang === "bn" ? cat.desc_bn || cat.desc_en : cat.desc_en || cat.desc_bn;
            return (
              <Link
                key={`${cat.href}-${i}`}
                href={cat.href}
                className="group relative flex flex-col items-center text-center gap-2 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--line)] hover:border-transparent bg-white dark:bg-white/5 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-300"
              >
                <span className={`w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} shadow-md flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-white" strokeWidth={2} aria-hidden />
                </span>
                <span className="text-xs sm:text-base font-bold text-heading leading-tight">{label}</span>
                <span className="text-[10px] sm:text-xs text-[var(--ink-muted)] line-clamp-1 group-hover:text-[var(--ink)] transition-colors">
                  {blurb}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
