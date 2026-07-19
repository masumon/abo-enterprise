"use client";
import Link from "next/link";
import {
  Smartphone, FileText, Wrench, Briefcase, Bot, Globe, Headphones, ShoppingBag, Printer, Calendar,
  type LucideIcon,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_QUICK_CATEGORIES_KEY, getQuickCategories, type CmsQuickCategory } from "@/lib/cmsContent";
import Reveal from "@/components/ui/Reveal";

/**
 * The seven core business verticals ABO Enterprise offers — placed directly
 * under the hero so a first-time visitor can identify (and tap into) each
 * within five seconds. Content is admin-editable via site_quick_categories_json;
 * the defaults below match the business brief.
 */

/** Icon names usable from the admin JSON. */
const ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  "file-text": FileText,
  wrench: Wrench,
  briefcase: Briefcase,
  bot: Bot,
  globe: Globe,
  headphones: Headphones,
  "shopping-bag": ShoppingBag,
  printer: Printer,
  calendar: Calendar,
};

/** Colour treatments cycle by position so admin-added tiles stay on palette. */
const STYLES = [
  {
    ring: "ring-blue-100 dark:ring-blue-800/40 hover:ring-blue-200",
    tint: "bg-blue-50/60 dark:bg-blue-900/20",
    iconWrap: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    ring: "ring-emerald-100 dark:ring-emerald-800/40 hover:ring-emerald-200",
    tint: "bg-emerald-50/60 dark:bg-emerald-900/20",
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    ring: "ring-orange-100 dark:ring-orange-800/40 hover:ring-orange-200",
    tint: "bg-orange-50/60 dark:bg-orange-900/20",
    iconWrap: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  {
    ring: "ring-indigo-100 dark:ring-indigo-800/40 hover:ring-indigo-200",
    tint: "bg-indigo-50/60 dark:bg-indigo-900/20",
    iconWrap: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  {
    ring: "ring-purple-100 dark:ring-purple-800/40 hover:ring-purple-200",
    tint: "bg-purple-50/60 dark:bg-purple-900/20",
    iconWrap: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  {
    ring: "ring-sky-100 dark:ring-sky-800/40 hover:ring-sky-200",
    tint: "bg-sky-50/60 dark:bg-sky-900/20",
    iconWrap: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
  {
    ring: "ring-rose-100 dark:ring-rose-800/40 hover:ring-rose-200",
    tint: "bg-rose-50/60 dark:bg-rose-900/20",
    iconWrap: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
];

const FALLBACK: CmsQuickCategory[] = [
  {
    icon: "smartphone",
    label_en: "Tech Store", label_bn: "টেক স্টোর",
    desc_en: "Accessories · Gadgets · Electronics", desc_bn: "এক্সেসরিজ · গ্যাজেট · ইলেকট্রনিক্স",
    href: "/products",
  },
  {
    icon: "file-text",
    label_en: "Digital Services", label_bn: "ডিজিটাল সেবা",
    desc_en: "Passport · NID · bKash · Print", desc_bn: "পাসপোর্ট · NID · বিকাশ · প্রিন্ট",
    href: "/services#digital-services",
  },
  {
    icon: "wrench",
    label_en: "Software Lab", label_bn: "সফটওয়্যার ল্যাব",
    desc_en: "Mobile · Computer software", desc_bn: "মোবাইল · কম্পিউটার সফটওয়্যার",
    href: "/services#software-lab",
  },
  {
    icon: "briefcase",
    label_en: "Business Software", label_bn: "বিজনেস সফটওয়্যার",
    desc_en: "POS · ERP · IPTV · ISP Billing", desc_bn: "POS · ERP · IPTV · ISP বিলিং",
    href: "/services#business-software",
  },
  {
    icon: "bot",
    label_en: "AI Solutions", label_bn: "AI সমাধান",
    desc_en: "Assistant · Automation · Custom AI", desc_bn: "অ্যাসিস্ট্যান্ট · অটোমেশন · কাস্টম AI",
    href: "/services#ai-solutions",
  },
  {
    icon: "globe",
    label_en: "Web Development", label_bn: "ওয়েব ডেভেলপমেন্ট",
    desc_en: "Websites · Web apps · Software", desc_bn: "ওয়েবসাইট · ওয়েব অ্যাপ · সফটওয়্যার",
    href: "/services#web-software",
  },
  {
    icon: "headphones",
    label_en: "IT Support", label_bn: "আইটি সাপোর্ট",
    desc_en: "Networking · CCTV · Maintenance", desc_bn: "নেটওয়ার্কিং · CCTV · রক্ষণাবেক্ষণ",
    href: "/services#it-support",
  },
];

export default function QuickCategories() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const { settings } = usePublicSettings([SITE_QUICK_CATEGORIES_KEY]);
  const verticals = getQuickCategories(settings, FALLBACK);

  return (
    <section
      className="py-8 sm:py-10 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[var(--surface-secondary)]"
      aria-labelledby="verticals-heading"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-baseline justify-between gap-4 mb-4 sm:mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300 font-bold">
              {bn ? "আমরা যা করি" : "What we do"}
            </p>
            <h2 id="verticals-heading" className="text-lg sm:text-xl font-bold text-heading mt-0.5">
              {bn
                ? "পণ্য থেকে সফটওয়্যার — এক প্ল্যাটফর্মে"
                : "From products to software — one platform"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {verticals.map((v, i) => {
            const Icon = ICONS[v.icon ?? ""] ?? Briefcase;
            const style = STYLES[i % STYLES.length];
            const label = bn ? v.label_bn || v.label_en : v.label_en || v.label_bn;
            const desc = bn ? v.desc_bn || v.desc_en : v.desc_en || v.desc_bn;
            return (
              <Reveal
                as="div"
                key={`${v.href}-${v.label_en || v.label_bn}`}
                delay={Math.min(i, 8) * 55}
                className="h-full"
              >
                <Link
                  href={v.href}
                  className={`group flex h-full flex-col items-start gap-2 p-3 sm:p-3.5 rounded-2xl ring-1 ${style.ring} ${style.tint}
                    transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(30,91,168,0.20)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
                  aria-label={label}
                >
                  <span
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${style.iconWrap}
                      group-hover:scale-105 transition-transform`}
                    aria-hidden
                  >
                    <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={2.1} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] sm:text-sm font-bold text-heading leading-tight">
                      {label}
                    </p>
                    <p className="text-[10.5px] sm:text-[11px] text-muted mt-0.5 leading-snug line-clamp-2">
                      {desc}
                    </p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
