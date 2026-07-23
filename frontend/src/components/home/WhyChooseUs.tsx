"use client";

import { Award, Store, Globe, Wrench, Bot, Truck, Shield, Users, Headphones, type LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_WHY_CHOOSE_KEY, getWhyChooseReasons, type CmsReason } from "@/lib/cmsContent";

/** Icon names usable from the admin JSON (site_why_choose_json). */
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  store: Store,
  globe: Globe,
  wrench: Wrench,
  bot: Bot,
  truck: Truck,
  shield: Shield,
  users: Users,
  headphones: Headphones,
};

const FALLBACK: CmsReason[] = [
  {
    icon: "award",
    title_en: "8+ Years Experience", title_bn: "৮+ বছরের অভিজ্ঞতা",
    desc_en: "Nearly a decade serving customers with trust and consistency.", desc_bn: "প্রায় এক দশক ধরে বিশ্বাস ও ধারাবাহিকতার সাথে গ্রাহক সেবা।",
  },
  {
    icon: "store",
    title_en: "Trusted Local Business", title_bn: "বিশ্বস্ত স্থানীয় ব্যবসা",
    desc_en: "An established name in Sylhet with a real storefront.", desc_bn: "সিলেটে বাস্তব দোকানসহ একটি প্রতিষ্ঠিত নাম।",
  },
  {
    icon: "globe",
    title_en: "Online + Offline Service", title_bn: "অনলাইন + অফলাইন সেবা",
    desc_en: "Visit our shop or order online — the choice is yours.", desc_bn: "দোকানে আসুন বা অনলাইনে অর্ডার করুন — পছন্দ আপনার।",
  },
  {
    icon: "wrench",
    title_en: "Experienced Engineers", title_bn: "অভিজ্ঞ ইঞ্জিনিয়ার",
    desc_en: "Skilled technicians for mobile, computer & software work.", desc_bn: "মোবাইল, কম্পিউটার ও সফটওয়্যারের দক্ষ টেকনিশিয়ান।",
  },
  {
    icon: "bot",
    title_en: "AI Powered Solutions", title_bn: "AI চালিত সমাধান",
    desc_en: "Modern automation and AI to grow your business.", desc_bn: "আপনার ব্যবসা বাড়াতে আধুনিক অটোমেশন ও AI।",
  },
  {
    icon: "truck",
    title_en: "Nationwide Service", title_bn: "সারাদেশে সেবা",
    desc_en: "Products and services delivered across Bangladesh.", desc_bn: "সারা বাংলাদেশে পণ্য ও সেবা পৌঁছে দেওয়া।",
  },
];

export default function WhyChooseUs() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_WHY_CHOOSE_KEY]);
  const reasons = getWhyChooseReasons(settings, FALLBACK);

  const card = (reason: CmsReason, key: string, opts?: { fixed?: boolean; hidden?: boolean }) => {
    const Icon = ICONS[reason.icon ?? ""] ?? Award;
    return (
      <GlassCard key={key} hover className={cn("p-6", opts?.fixed && "w-64 sm:w-72 flex-shrink-0")} aria-hidden={opts?.hidden}>
        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-brand-600 dark:text-brand-300" />
        </div>
        <h3 className="font-bold text-heading mb-2 text-sm">
          {lang === "bn" ? reason.title_bn || reason.title_en : reason.title_en || reason.title_bn}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
          {lang === "bn" ? reason.desc_bn || reason.desc_en : reason.desc_en || reason.desc_bn}
        </p>
      </GlassCard>
    );
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "কেন ABO Enterprise?" : "Why Choose ABO Enterprise?"}</h2>
          <div className="section-divider" />
        </div>

        {/* Desktop: clean 3-column grid. */}
        <div className="hidden lg:grid grid-cols-3 gap-5">
          {reasons.map((reason) => card(reason, reason.title_en || reason.title_bn || ""))}
        </div>
      </div>

      {/* Mobile/tablet: premium right-to-left marquee (was a long vertical stack). */}
      <div className="lg:hidden marquee-viewport" style={{ "--marquee-duration": "50s" } as React.CSSProperties}>
        <div className="marquee-track gap-5 px-4 py-1">
          {[...reasons, ...reasons].map((reason, i) =>
            card(reason, `${reason.title_en || reason.title_bn}-${i}`, { fixed: true, hidden: i >= reasons.length })
          )}
        </div>
      </div>
    </section>
  );
}
