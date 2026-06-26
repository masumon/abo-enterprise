"use client";

import { Users, Package, Truck, Shield, Code, Brain } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const STATS = [
  { icon: Users, value: "500+", label: { en: "Happy Clients", bn: "সন্তুষ্ট গ্রাহক" } },
  { icon: Package, value: "200+", label: { en: "Products", bn: "পণ্য" } },
  { icon: Code, value: "50+", label: { en: "Software Projects", bn: "সফটওয়্যার প্রজেক্ট" } },
  { icon: Truck, value: "FREE", label: { en: "Delivery", bn: "ডেলিভারি" } },
  { icon: Brain, value: "10+", label: { en: "AI Solutions", bn: "AI সমাধান" } },
  { icon: Shield, value: "100%", label: { en: "Secure", bn: "নিরাপদ" } },
];

export default function Stats() {
  const { lang } = useLanguageStore();

  return (
    <section className="gradient-brand py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label.en} className="text-center text-white">
              <Icon className="w-6 h-6 mx-auto mb-2 text-white/70" />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-white/70 mt-0.5">
                {lang === "bn" ? label.bn : label.en}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
