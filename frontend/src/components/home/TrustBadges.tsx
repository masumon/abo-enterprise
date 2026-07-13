"use client";

import { Shield, Users, CreditCard, Headphones, Award, Globe } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const BADGES = [
  { icon: Award, label: { en: "8+ Years Experience", bn: "৮+ বছরের অভিজ্ঞতা" } },
  { icon: Users, label: { en: "10,000+ Customers", bn: "১০,০০০+ গ্রাহক" } },
  { icon: Globe, label: { en: "Online & Offline", bn: "অনলাইন ও অফলাইন" } },
  { icon: Headphones, label: { en: "Professional Support", bn: "পেশাদার সাপোর্ট" } },
  { icon: Shield, label: { en: "Verified Business", bn: "যাচাইকৃত ব্যবসা" } },
  { icon: CreditCard, label: { en: "Secure Payment", bn: "নিরাপদ পেমেন্ট" } },
];

export default function TrustBadges() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-8 border-y border-gray-100 dark:border-white/5 bg-white/60 dark:bg-white/[0.02]">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          {BADGES.map(({ icon: Icon, label }) => (
            <div key={label.en} className="flex items-center gap-2 text-sm text-muted">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
                <Icon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
              </div>
              <span className="font-medium">{lang === "bn" ? label.bn : label.en}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
