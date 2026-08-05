"use client";

import Link from "next/link";
import {
  Package,
  Wrench,
  Laptop,
  ShoppingBag,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_ENTRY_POINTS_KEY, getEntryPoints, type CmsEntryPoint } from "@/lib/cmsContent";

/** Common lucide names admins are likely to pick (the admin field also
 * accepts a raw emoji — see resolveEntryIcon below). */
const ICONS: Record<string, LucideIcon> = {
  package: Package,
  wrench: Wrench,
  laptop: Laptop,
  "shopping-bag": ShoppingBag,
};

/** The admin field hint is "lucide name or emoji" — anything not in our
 * known lucide map is rendered as literal text so an admin-entered emoji
 * still shows correctly instead of silently falling back. */
function isKnownLucideName(icon: string): icon is keyof typeof ICONS {
  return icon in ICONS;
}

const FALLBACK: CmsEntryPoint[] = [
  {
    icon: "shopping-bag",
    title_en: "Shop Products", title_bn: "পণ্য কিনুন",
    desc_en: "Mobile accessories, gadgets & electronics with fast delivery across Bangladesh.",
    desc_bn: "মোবাইল এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স — সারা বাংলাদেশে দ্রুত ডেলিভারি।",
    cta_en: "Browse Products", cta_bn: "পণ্য দেখুন",
    href: "/products",
    tags_en: ["Fast Delivery", "COD Available"],
    tags_bn: ["দ্রুত ডেলিভারি", "COD সুবিধা"],
  },
  {
    icon: "wrench",
    title_en: "Book a Service", title_bn: "সেবা বুক করুন",
    desc_en: "Passport, NID, printing, repairs & more — book online in minutes.",
    desc_bn: "পাসপোর্ট, NID, প্রিন্টিং, সার্ভিসিং ও আরও অনেক কিছু — অনলাইনে বুক করুন।",
    cta_en: "Explore Services", cta_bn: "সেবা দেখুন",
    href: "/services",
    tags_en: ["Same-day Slots", "Verified Pricing"],
    tags_bn: ["একই দিনে স্লট", "যাচাইকৃত মূল্য"],
  },
  {
    icon: "laptop",
    title_en: "Get a Software Quote", title_bn: "সফটওয়্যার কোটেশন নিন",
    desc_en: "POS, ERP, AI automation & custom software for your business.",
    desc_bn: "আপনার ব্যবসার জন্য POS, ERP, AI অটোমেশন ও কাস্টম সফটওয়্যার।",
    cta_en: "Request a Quote", cta_bn: "কোটেশন চান",
    href: "/services/quote",
    tags_en: ["Free Consultation"],
    tags_bn: ["ফ্রি পরামর্শ"],
  },
];

export default function EntryPointCards() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_ENTRY_POINTS_KEY]);
  const points = getEntryPoints(settings, FALLBACK);

  if (points.length === 0) return null;

  return (
    <section className="py-10 sm:py-14">
      <div className="container mx-auto px-4">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {points.map((p, i) => {
            const icon = p.icon ?? "";
            const Icon = isKnownLucideName(icon) ? ICONS[icon] : null;
            const title = lang === "bn" ? p.title_bn || p.title_en : p.title_en || p.title_bn;
            const desc = lang === "bn" ? p.desc_bn || p.desc_en : p.desc_en || p.desc_bn;
            const cta = lang === "bn" ? p.cta_bn || p.cta_en : p.cta_en || p.cta_bn;
            const tags = (lang === "bn" ? p.tags_bn : p.tags_en) ?? [];
            return (
              <GlassCard key={`${p.href}-${i}`} hover className="p-6 flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center mb-4">
                  {Icon ? (
                    <Icon className="w-6 h-6 text-brand-600 dark:text-brand-300" aria-hidden />
                  ) : (
                    <span className="text-2xl leading-none" aria-hidden>{icon || "•"}</span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-heading mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4 flex-1">{desc}</p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.map((tag) => (
                      <span key={tag} className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <Link href={p.href} className="btn btn-brand btn-sm w-full justify-center mt-auto">
                  {cta || (lang === "bn" ? "আরও দেখুন" : "Learn More")}
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
