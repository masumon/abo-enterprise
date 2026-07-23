"use client";
import Link from "next/link";
import { ShoppingBag, Calendar, Briefcase, Bot, Wrench, Globe, ArrowRight, type LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_ENTRY_POINTS_KEY, getEntryPoints, type CmsEntryPoint } from "@/lib/cmsContent";

/** Icon names usable from the admin JSON (site_entry_points_json). */
const ICONS: Record<string, LucideIcon> = {
  "shopping-bag": ShoppingBag,
  calendar: Calendar,
  briefcase: Briefcase,
  bot: Bot,
  wrench: Wrench,
  globe: Globe,
};

/** Colour treatments cycle by position so admin-edited cards stay on palette. */
const STYLES = [
  {
    gradient: "from-blue-600 to-blue-700",
    lightBg: "bg-blue-50",
    lightText: "text-blue-700",
    border: "border-blue-100",
  },
  {
    gradient: "from-green-600 to-emerald-700",
    lightBg: "bg-green-50",
    lightText: "text-green-700",
    border: "border-green-100",
  },
  {
    gradient: "from-purple-600 to-violet-700",
    lightBg: "bg-purple-50",
    lightText: "text-purple-700",
    border: "border-purple-100",
  },
];

const FALLBACK: CmsEntryPoint[] = [
  {
    icon: "shopping-bag",
    title_en: "Shop Tech Products", title_bn: "টেক পণ্য কিনুন",
    desc_en: "Mobile accessories, premium gadgets & electronics. Fast delivery across Sylhet.",
    desc_bn: "মোবাইল এক্সেসরিজ, প্রিমিয়াম গ্যাজেট ও ইলেকট্রনিক্স। সিলেটে দ্রুত ডেলিভারি।",
    cta_en: "Browse Products", cta_bn: "পণ্য দেখুন",
    href: "/products",
    tags_en: ["Accessories", "Gadgets", "Electronics"],
    tags_bn: ["এক্সেসরিজ", "গ্যাজেট", "ইলেকট্রনিক্স"],
  },
  {
    icon: "calendar",
    title_en: "Digital Service Center", title_bn: "ডিজিটাল সার্ভিস সেন্টার",
    desc_en: "Passport, NID, bKash, printing plus mobile & computer software support.",
    desc_bn: "পাসপোর্ট, NID, বিকাশ, প্রিন্টিং এবং মোবাইল ও কম্পিউটার সফটওয়্যার সেবা।",
    cta_en: "Explore Services", cta_bn: "সেবা দেখুন",
    href: "/services",
    tags_en: ["Digital Services", "Printing", "Software Lab"],
    tags_bn: ["ডিজিটাল সেবা", "প্রিন্টিং", "সফটওয়্যার ল্যাব"],
  },
  {
    icon: "briefcase",
    title_en: "Business Solutions", title_bn: "ব্যবসা সমাধান",
    desc_en: "POS, ERP, IPTV, ISP billing, AI automation & custom software for your business.",
    desc_bn: "POS, ERP, IPTV, ISP বিলিং, AI অটোমেশন ও কাস্টম সফটওয়্যার আপনার ব্যবসার জন্য।",
    cta_en: "Get a Free Quote", cta_bn: "ফ্রি কোটেশন নিন",
    href: "/projects",
    tags_en: ["POS / ERP", "AI Solutions", "Custom Software"],
    tags_bn: ["POS / ERP", "AI সমাধান", "কাস্টম সফটওয়্যার"],
  },
];

export default function EntryPoints() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_ENTRY_POINTS_KEY]);
  const entries = getEntryPoints(settings, FALLBACK);

  return (
    <section className="enterprise-section-alt">
      <div className="container mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
            {lang === "bn" ? "আপনি কী খুঁজছেন?" : "What are you looking for?"}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            {lang === "bn"
              ? "নিচের ৩টি পথের যেকোনো একটি বেছে নিন — আমরা বাকি কাজ করব।"
              : "Pick one of the three paths below — we'll take care of the rest."}
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {entries.map((entry, i) => {
            const Icon = ICONS[entry.icon ?? ""] ?? Briefcase;
            const style = STYLES[i % STYLES.length];
            const tags = (lang === "bn" ? entry.tags_bn ?? entry.tags_en : entry.tags_en ?? entry.tags_bn) ?? [];
            return (
              <Link
                key={`${entry.href}-${entry.title_en || entry.title_bn}`}
                href={entry.href}
                className="group card-hover overflow-hidden flex flex-col hover:-translate-y-1.5"
              >
                {/* Card top gradient strip */}
                <div className={`h-1 w-full bg-gradient-to-r ${style.gradient}`} />

                <div className="p-6 flex flex-col flex-1">
                  {/* Icon + "which of the 3 paths" badge */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-lg overflow-hidden group-hover:scale-105 transition-transform after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/35 after:to-transparent`}>
                      <Icon className="relative z-10 w-7 h-7 text-white" />
                    </div>
                    <span className={`ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full ${style.lightBg} ${style.lightText} border ${style.border}`}>
                      {lang === "bn" ? `পথ ${i + 1}/${entries.length}` : `Path ${i + 1}/${entries.length}`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-heading mb-2">
                    {lang === "bn" ? entry.title_bn || entry.title_en : entry.title_en || entry.title_bn}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">
                    {lang === "bn" ? entry.desc_bn || entry.desc_en : entry.desc_en || entry.desc_bn}
                  </p>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.lightBg} ${style.lightText} border ${style.border}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* CTA — filled gradient button so it's obvious where to tap */}
                  <span className={`mt-auto inline-flex items-center justify-center gap-2 text-white font-semibold text-sm py-2.5 rounded-xl bg-gradient-to-r ${style.gradient} shadow-md group-hover:gap-3 transition-all`}>
                    {lang === "bn" ? entry.cta_bn || entry.cta_en : entry.cta_en || entry.cta_bn}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
