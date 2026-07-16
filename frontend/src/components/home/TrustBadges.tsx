"use client";

import { Shield, Users, CreditCard, Headphones, Award, Globe, Truck, Store, Clock, type LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_TRUST_BADGES_KEY, getTrustBadges, type CmsIconLabel } from "@/lib/cmsContent";

/** Icon names usable from the admin JSON (site_trust_badges_json). */
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  users: Users,
  globe: Globe,
  headphones: Headphones,
  shield: Shield,
  "credit-card": CreditCard,
  truck: Truck,
  store: Store,
  clock: Clock,
};

const FALLBACK: CmsIconLabel[] = [
  { icon: "award", en: "8+ Years Experience", bn: "৮+ বছরের অভিজ্ঞতা" },
  { icon: "users", en: "10,000+ Customers", bn: "১০,০০০+ গ্রাহক" },
  { icon: "globe", en: "Online & Offline", bn: "অনলাইন ও অফলাইন" },
  { icon: "headphones", en: "Professional Support", bn: "পেশাদার সাপোর্ট" },
  { icon: "shield", en: "Verified Business", bn: "যাচাইকৃত ব্যবসা" },
  { icon: "credit-card", en: "Secure Payment", bn: "নিরাপদ পেমেন্ট" },
];

export default function TrustBadges() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_TRUST_BADGES_KEY]);
  const badges = getTrustBadges(settings, FALLBACK);

  return (
    <section className="py-8 border-y border-gray-100 dark:border-white/5 bg-white/60 dark:bg-white/[0.02]">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          {badges.map((badge) => {
            const Icon = ICONS[badge.icon ?? ""] ?? Shield;
            return (
              <div key={badge.en || badge.bn} className="flex items-center gap-2 text-sm text-muted">
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                </div>
                <span className="font-medium">{lang === "bn" ? badge.bn || badge.en : badge.en || badge.bn}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
