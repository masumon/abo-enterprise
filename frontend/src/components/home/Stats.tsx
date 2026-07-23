"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, Package, Clock, Headphones } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import GlassCard from "@/components/ui/GlassCard";
import { publicApi } from "@/lib/api";

import { MARKETING_STATS } from "@/lib/siteDefaults";

import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";

type StatItem = { icon: LucideIcon; end: number; suffix: string; key: TranslationKey };

const FALLBACK: StatItem[] = [
  { icon: Users, end: MARKETING_STATS.clients, suffix: "+", key: "trust_clients" },
  { icon: Briefcase, end: MARKETING_STATS.projects, suffix: "+", key: "trust_projects" },
  { icon: Package, end: MARKETING_STATS.products, suffix: "+", key: "trust_products" },
  { icon: Clock, end: MARKETING_STATS.years, suffix: "+", key: "trust_years" },
  { icon: Headphones, end: 24, suffix: "/7", key: "trust_support" },
];

function statValue(actual: number | undefined, floor: number): number {
  if (!actual || actual <= 0) return floor;
  return actual;
}

export default function Stats() {
  const t = useT();
  const [stats, setStats] = useState(FALLBACK);

  useEffect(() => {
    publicApi.stats().then((r) => {
      const d = r.data.data;
      if (!d) return;
      setStats([
        { icon: Users, end: statValue(d.clients, MARKETING_STATS.clients), suffix: "+", key: "trust_clients" },
        { icon: Briefcase, end: statValue(d.projects, MARKETING_STATS.projects), suffix: "+", key: "trust_projects" },
        { icon: Package, end: statValue(d.products, MARKETING_STATS.products), suffix: "+", key: "trust_products" },
        { icon: Clock, end: statValue(d.years, MARKETING_STATS.years), suffix: "+", key: "trust_years" },
        { icon: Headphones, end: 24, suffix: "/7", key: "trust_support" },
      ]);
    }).catch(() => {});
  }, []);

  // Duplicate for a seamless right-to-left marquee loop.
  const loop = [...stats, ...stats];

  return (
    <section className="py-14 gradient-surface" aria-label="Trust statistics">
      <div className="marquee-viewport" style={{ "--marquee-duration": "42s" } as React.CSSProperties}>
        <div className="marquee-track gap-4 px-2">
          {loop.map(({ icon: Icon, end, suffix, key }, i) => (
            <GlassCard key={`${key}-${i}`} hover className="p-6 text-center w-40 sm:w-48 flex-shrink-0" aria-hidden={i >= stats.length}>
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center">
                <Icon className="w-6 h-6 text-brand-600 dark:text-brand-300" aria-hidden />
              </div>
              <p className="text-3xl font-bold text-brand-700 dark:text-brand-200">
                <AnimatedCounter end={end} suffix={suffix} />
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(key)}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
