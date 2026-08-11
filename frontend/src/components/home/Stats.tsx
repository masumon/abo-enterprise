"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, Package, Clock, Headphones } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import GlassCard from "@/components/ui/GlassCard";
import AutoScrollRow from "@/components/ui/AutoScrollRow";
import { publicApi } from "@/lib/api";

import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";

type StatItem = { icon: LucideIcon; end: number | null; suffix: string; key: TranslationKey };

const INITIAL_STATS: StatItem[] = [
  { icon: Users, end: null, suffix: "+", key: "trust_clients" },
  { icon: Briefcase, end: null, suffix: "+", key: "trust_projects" },
  { icon: Package, end: null, suffix: "+", key: "trust_products" },
  { icon: Clock, end: null, suffix: "+", key: "trust_years" },
  { icon: Headphones, end: 24, suffix: "/7", key: "trust_support" },
];

export default function Stats() {
  const t = useT();
  const [stats, setStats] = useState(INITIAL_STATS);

  useEffect(() => {
    publicApi.stats().then((r) => {
      const d = r.data.data;
      if (!d) return;
      setStats([
        { icon: Users, end: typeof d.clients === "number" ? d.clients : null, suffix: "+", key: "trust_clients" },
        { icon: Briefcase, end: typeof d.projects === "number" ? d.projects : null, suffix: "+", key: "trust_projects" },
        { icon: Package, end: typeof d.products === "number" ? d.products : null, suffix: "+", key: "trust_products" },
        { icon: Clock, end: typeof d.years === "number" ? d.years : null, suffix: "+", key: "trust_years" },
        { icon: Headphones, end: 24, suffix: "/7", key: "trust_support" },
      ]);
    }).catch(() => {});
  }, []);

  return (
    <section className="py-14 gradient-surface" aria-label="Trust statistics">
      <div className="container mx-auto px-2">
        <AutoScrollRow
          items={stats}
          keyExtractor={(s) => s.key}
          spaceBetween={16}
          renderItem={({ icon: Icon, end, suffix, key }) => (
            <GlassCard hover className="p-6 text-center w-40 sm:w-48">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-50 dark:bg-brand-500/15 flex items-center justify-center">
                <Icon className="w-6 h-6 text-brand-600 dark:text-brand-300" aria-hidden />
              </div>
              <p className="text-3xl font-bold text-brand-700 dark:text-brand-200">
                {end === null ? "—" : <AnimatedCounter end={end} suffix={suffix} />}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(key)}</p>
            </GlassCard>
          )}
        />
      </div>
    </section>
  );
}
