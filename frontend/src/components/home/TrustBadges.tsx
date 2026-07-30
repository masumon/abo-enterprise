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

/*
 * Screen 04's proof strip. GAP-13 took the invented figures off /about but this
 * list still shipped "10,000+ Customers" and "8+ Years Experience" on the
 * homepage, which is the same claim in a louder place — and the artifact names
 * it directly: those numbers may not come back into the proof strip.
 *
 * What replaces them is what the shop can actually be held to: how you pay,
 * whether you can send it back, what delivery costs in Sylhet, and which
 * wallets work. Every line here is checkable by the customer on the day.
 *
 * These are only the fallback. An admin who fills site_trust_badges_json still
 * overrides all of it.
 */
const FALLBACK: CmsIconLabel[] = [
  { icon: "truck", en: "Cash on delivery", bn: "নগদে ডেলিভারি" },
  { icon: "shield", en: "7-day return", bn: "৭ দিনে ফেরত" },
  { icon: "store", en: "Sylhet · free delivery", bn: "সিলেটে ফ্রি ডেলিভারি" },
  { icon: "credit-card", en: "bKash · Nagad", bn: "বিকাশ · নগদ" },
  { icon: "clock", en: "Since 2017", bn: "২০১৭ সাল থেকে" },
];

export default function TrustBadges() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_TRUST_BADGES_KEY]);
  const badges = getTrustBadges(settings, FALLBACK);

  // Duplicate the list so the right-to-left marquee loops seamlessly.
  const loop = [...badges, ...badges];

  return (
    <section className="py-8 border-y border-gray-100 dark:border-white/5 bg-white/60 dark:bg-white/[0.02]" aria-label="Trust highlights">
      <div className="marquee-viewport" style={{ "--marquee-duration": "38s" } as React.CSSProperties}>
        <div className="marquee-track gap-4 md:gap-8">
          {loop.map((badge, i) => {
            const Icon = ICONS[badge.icon ?? ""] ?? Shield;
            return (
              <div
                key={`${badge.en || badge.bn}-${i}`}
                aria-hidden={i >= badges.length}
                className="flex items-center gap-2 text-sm text-muted flex-shrink-0 px-3 py-2 rounded-full bg-white/70 dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
                </div>
                <span className="font-medium whitespace-nowrap">{lang === "bn" ? badge.bn || badge.en : badge.en || badge.bn}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
