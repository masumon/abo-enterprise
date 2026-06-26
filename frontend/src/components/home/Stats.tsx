"use client";

import { Users, Briefcase, Package, Clock, Headphones } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import GlassCard from "@/components/ui/GlassCard";

const STATS = [
  { icon: Users, end: 500, suffix: "+", key: "trust_clients" as const },
  { icon: Briefcase, end: 50, suffix: "+", key: "trust_projects" as const },
  { icon: Package, end: 200, suffix: "+", key: "trust_products" as const },
  { icon: Clock, end: 5, suffix: "+", key: "trust_years" as const },
  { icon: Headphones, end: 24, suffix: "/7", key: "trust_support" as const },
];

export default function Stats() {
  const t = useT();

  return (
    <section className="py-14 gradient-surface">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATS.map(({ icon: Icon, end, suffix, key }) => (
            <GlassCard key={key} hover className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-brand-50 flex items-center justify-center">
                <Icon className="w-6 h-6 text-brand-600" />
              </div>
              <p className="text-3xl font-bold text-brand-700">
                <AnimatedCounter end={end} suffix={suffix} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{t(key)}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
