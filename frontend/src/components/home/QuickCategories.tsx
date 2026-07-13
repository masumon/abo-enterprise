"use client";
import Link from "next/link";
import {
  ShoppingBag, Printer, Scale, Sparkles, Brain, Code2, Smartphone, Monitor, Building2,
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
    label: { en: "Premium Tech Store", bn: "প্রিমিয়াম টেক স্টোর" },
    desc: { en: "Accessories · Gadgets · Electronics", bn: "অ্যাকসেসরিজ · গ্যাজেট · ইলেকট্রনিক্স" },
    href: "/products",
    ring: "ring-blue-100 dark:ring-blue-800/40 hover:ring-blue-200",
    tint: "bg-blue-50/60 dark:bg-blue-900/20",
    iconWrap: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    icon: Building2,
    label: { en: "Digital Service Center", bn: "ডিজিটাল সার্ভিস সেন্টার" },
    desc: { en: "Online forms · Govt support", bn: "অনলাইন ফর্ম · সরকারি সহায়তা" },
    href: "/services/legal",
    ring: "ring-cyan-100 dark:ring-cyan-800/40 hover:ring-cyan-200",
    tint: "bg-cyan-50/60 dark:bg-cyan-900/20",
    iconWrap: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  },
  {
    icon: Printer,
    label: { en: "Printing & Docs", bn: "প্রিন্টিং ও ডকুমেন্ট" },
    desc: { en: "Cards · Banners · Documentation", bn: "কার্ড · ব্যানার · ডকুমেন্টেশন" },
    href: "/services/printing",
    ring: "ring-orange-100 dark:ring-orange-800/40 hover:ring-orange-200",
    tint: "bg-orange-50/60 dark:bg-orange-900/20",
    iconWrap: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  {
    icon: Smartphone,
    label: { en: "Mobile Software Lab", bn: "মোবাইল সফটওয়্যার ল্যাব" },
    desc: { en: "Firmware · Recovery · Repair", bn: "ফার্মওয়্যার · রিকভারি · রিপেয়ার" },
    href: "/services/software",
    ring: "ring-fuchsia-100 dark:ring-fuchsia-800/40 hover:ring-fuchsia-200",
    tint: "bg-fuchsia-50/60 dark:bg-fuchsia-900/20",
    iconWrap: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
  },
  {
    icon: Monitor,
    label: { en: "Computer Software", bn: "কম্পিউটার সফটওয়্যার" },
    desc: { en: "OS · Drivers · Optimization", bn: "OS · ড্রাইভার · অপ্টিমাইজেশন" },
    href: "/services/software",
    ring: "ring-slate-100 dark:ring-slate-700/40 hover:ring-slate-200",
    tint: "bg-slate-50/60 dark:bg-slate-800/30",
    iconWrap: "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200",
  },
  {
    icon: Scale,
    label: { en: "Legal & Office", bn: "লিগ্যাল ও অফিস" },
    desc: { en: "Case writing · Office services", bn: "কেস রাইটিং · অফিস সেবা" },
    href: "/services/legal",
    ring: "ring-red-100 dark:ring-red-800/40 hover:ring-red-200",
    tint: "bg-red-50/60 dark:bg-red-900/20",
    iconWrap: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  {
    icon: Sparkles,
    label: { en: "Business Software", bn: "বিজনেস সফটওয়্যার" },
    desc: { en: "POS · ERP · CRM · Billing", bn: "POS · ERP · CRM · বিলিং" },
    href: "/projects",
    ring: "ring-emerald-100 dark:ring-emerald-800/40 hover:ring-emerald-200",
    tint: "bg-emerald-50/60 dark:bg-emerald-900/20",
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    icon: Brain,
    label: { en: "AI Solutions", bn: "AI সমাধান" },
    desc: { en: "Automation · Intelligent workflows", bn: "অটোমেশন · স্মার্ট ওয়ার্কফ্লো" },
    href: "/projects?category=ai",
    ring: "ring-purple-100 dark:ring-purple-800/40 hover:ring-purple-200",
    tint: "bg-purple-50/60 dark:bg-purple-900/20",
    iconWrap: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  {
    icon: Code2,
    label: { en: "Web & Custom Software", bn: "ওয়েব ও কাস্টম সফটওয়্যার" },
    desc: { en: "Website · App · API development", bn: "ওয়েবসাইট · অ্যাপ · API ডেভেলপমেন্ট" },
    href: "/services/software",
    ring: "ring-indigo-100 dark:ring-indigo-800/40 hover:ring-indigo-200",
    tint: "bg-indigo-50/60 dark:bg-indigo-900/20",
    iconWrap: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  {
    icon: Sparkles,
    label: { en: "Business & IT Support", bn: "বিজনেস ও আইটি সাপোর্ট" },
    desc: { en: "Consulting · On-call support", bn: "কনসাল্টিং · অন-কল সাপোর্ট" },
    href: "/contact",
    ring: "ring-amber-100 dark:ring-amber-800/40 hover:ring-amber-200",
    tint: "bg-amber-50/60 dark:bg-amber-900/20",
    iconWrap: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
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
                ? "ABO Enterprise-এর মূল ব্যবসা ইউনিট"
                : "ABO Enterprise Core Business Units"}
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
