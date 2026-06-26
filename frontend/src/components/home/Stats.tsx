"use client";

import { Users, Package, Truck, Shield, Code, Brain } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const STATS = [
  { icon: Users,   value: "500+", label: { en: "Happy Clients",     bn: "সন্তুষ্ট গ্রাহক" } },
  { icon: Package, value: "200+", label: { en: "Products",          bn: "পণ্য" } },
  { icon: Code,    value: "50+",  label: { en: "Software Projects", bn: "সফটওয়্যার প্রজেক্ট" } },
  { icon: Truck,   value: "FREE", label: { en: "Delivery",          bn: "ডেলিভারি" } },
  { icon: Brain,   value: "10+",  label: { en: "AI Solutions",      bn: "AI সমাধান" } },
  { icon: Shield,  value: "100%", label: { en: "Secure",            bn: "নিরাপদ" } },
];

export default function Stats() {
  const { lang } = useLanguageStore();

  return (
    <section className="gradient-brand py-10 relative overflow-hidden">
      {/* subtle shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label.en}
              className="text-center text-white group"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:bg-white/20">
                <Icon className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
              </div>
              <div className="text-2xl font-bold tracking-tight">{value}</div>
              <div className="text-xs text-white/70 mt-0.5 font-medium">
                {lang === "bn" ? label.bn : label.en}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
