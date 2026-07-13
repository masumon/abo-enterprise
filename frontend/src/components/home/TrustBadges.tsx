"use client";

import { Shield, Truck, CreditCard, Headphones, Award, Lock } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const BADGES = [
  { icon: Shield, label: { en: "Verified Brand in Sylhet", bn: "সিলেটে যাচাইকৃত ব্র্যান্ড" } },
  { icon: Truck, label: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" } },
  { icon: CreditCard, label: { en: "Secure Payment Options", bn: "নিরাপদ পেমেন্ট অপশন" } },
  { icon: Headphones, label: { en: "Extended Support Hours", bn: "বর্ধিত সাপোর্ট সময়" } },
  { icon: Award, label: { en: "Multi-Service Experience", bn: "বহুমুখী সেবার অভিজ্ঞতা" } },
  { icon: Lock, label: { en: "Data & Document Safety", bn: "ডেটা ও ডকুমেন্ট নিরাপত্তা" } },
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
