"use client";

import { Shield, Users, CreditCard, Headphones, Award, Globe, Truck, Store, Clock, type LucideIcon } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_TRUST_BADGES_KEY, getTrustBadges, type CmsIconLabel } from "@/lib/cmsContent";

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
  { icon: "truck", en: "Cash on delivery", bn: "নগদে ডেলিভারি" },
  { icon: "shield", en: "7-day return", bn: "৭ দিনে ফেরত" },
  { icon: "store", en: "Sylhet · free delivery", bn: "সিলেটে ফ্রি ডেলিভারি" },
  { icon: "credit-card", en: "bKash · Nagad", bn: "বিকাশ · নগদ" },
];

export default function TrustBadges() {
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_TRUST_BADGES_KEY]);
  const badges = getTrustBadges(settings, FALLBACK);

  return (
    <div
      className="flex gap-1.5 px-3 py-3 overflow-x-auto scrollbar-hide"
      aria-label="Trust highlights"
    >
      {badges.map((badge, i) => {
        const text = lang === "bn" ? badge.bn || badge.en : badge.en || badge.bn;
        const isVerifiable = badge.icon === "truck" || badge.icon === "shield";
        return (
          <span
            key={`${badge.en || badge.bn}-${i}`}
            className={
              isVerifiable
                ? "flex-none inline-flex items-center gap-1 text-[9.5px] font-bold py-[3px] px-[7px] rounded-full bg-[var(--good-wash,#e3f1e9)] text-[var(--good,#2e7d4f)] dark:bg-[#14301f] dark:text-[#5bb183]"
                : "flex-none inline-flex items-center gap-1 text-[9.5px] font-bold py-[3px] px-[7px] rounded-full bg-[var(--surface-secondary,#e9ebf3)] text-[var(--ink-muted,#575e78)] dark:bg-[#1c2242] dark:text-[#98a0be]"
            }
          >
            {isVerifiable && "✓ "}{text}
          </span>
        );
      })}
    </div>
  );
}
