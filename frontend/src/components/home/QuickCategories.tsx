"use client";
import Link from "next/link";
import {
  ShoppingBag, Printer, Scale, Sparkles, Brain, Code2,
  type LucideIcon,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";

/**
 * The six business verticals ABO Enterprise offers — placed directly under
 * the hero so a first-time visitor can identify (and tap into) each within
 * five seconds. Order and labels match the audit brief.
 */
interface Vertical {
  icon: LucideIcon;
  label: { en: string; bn: string };
  desc: { en: string; bn: string };
  href: string;
  ring: string;   // ring/border colour
  tint: string;   // subtle background tint
  iconWrap: string;
}

const VERTICALS: Vertical[] = [
  {
    icon: ShoppingBag,
    label: { en: "Products", bn: "পণ্য" },
    desc: { en: "Mobile accessories", bn: "মোবাইল অ্যাকসেসরিজ" },
    href: "/products",
    ring: "ring-blue-100 dark:ring-blue-800/40 hover:ring-blue-200",
    tint: "bg-blue-50/60 dark:bg-blue-900/20",
    iconWrap: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    icon: Printer,
    label: { en: "Printing", bn: "প্রিন্টিং" },
    desc: { en: "Cards · Banners · Books", bn: "কার্ড · ব্যানার · বই" },
    href: "/services/printing",
    ring: "ring-orange-100 dark:ring-orange-800/40 hover:ring-orange-200",
    tint: "bg-orange-50/60 dark:bg-orange-900/20",
    iconWrap: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  {
    icon: Scale,
    label: { en: "Legal", bn: "লিগ্যাল" },
    desc: { en: "Cases · Passport · Docs", bn: "মামলা · পাসপোর্ট · ডকুমেন্ট" },
    href: "/services/legal",
    ring: "ring-red-100 dark:ring-red-800/40 hover:ring-red-200",
    tint: "bg-red-50/60 dark:bg-red-900/20",
    iconWrap: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  {
    icon: Sparkles,
    label: { en: "Digital Services", bn: "ডিজিটাল সেবা" },
    desc: { en: "Websites · Social · SEO", bn: "ওয়েবসাইট · সোশ্যাল · SEO" },
    href: "/services",
    ring: "ring-emerald-100 dark:ring-emerald-800/40 hover:ring-emerald-200",
    tint: "bg-emerald-50/60 dark:bg-emerald-900/20",
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    icon: Brain,
    label: { en: "AI Solutions", bn: "AI সমাধান" },
    desc: { en: "Chatbots · Automation", bn: "চ্যাটবট · অটোমেশন" },
    href: "/projects?category=ai",
    ring: "ring-purple-100 dark:ring-purple-800/40 hover:ring-purple-200",
    tint: "bg-purple-50/60 dark:bg-purple-900/20",
    iconWrap: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  {
    icon: Code2,
    label: { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" },
    desc: { en: "ERP · POS · Apps", bn: "ERP · POS · অ্যাপ" },
    href: "/services/software",
    ring: "ring-indigo-100 dark:ring-indigo-800/40 hover:ring-indigo-200",
    tint: "bg-indigo-50/60 dark:bg-indigo-900/20",
    iconWrap: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
];

export default function QuickCategories() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";

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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {VERTICALS.map((v) => {
            const Icon = v.icon;
            return (
              <Link
                key={v.label.en}
                href={v.href}
                className={`group flex flex-col items-start gap-2 p-3 sm:p-3.5 rounded-2xl ring-1 ${v.ring} ${v.tint}
                  transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(30,91,168,0.20)]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500`}
                aria-label={bn ? v.label.bn : v.label.en}
              >
                <span
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${v.iconWrap}
                    group-hover:scale-105 transition-transform`}
                  aria-hidden
                >
                  <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={2.1} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] sm:text-sm font-bold text-heading leading-tight">
                    {bn ? v.label.bn : v.label.en}
                  </p>
                  <p className="text-[10.5px] sm:text-[11px] text-muted mt-0.5 leading-snug line-clamp-2">
                    {bn ? v.desc.bn : v.desc.en}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
