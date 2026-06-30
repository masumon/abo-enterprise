"use client";

import { MessageSquare, FileSearch, Rocket, Headphones } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import SectionHeader from "@/components/ui/SectionHeader";

const STEPS = [
  {
    icon: MessageSquare,
    title: { en: "Consultation", bn: "পরামর্শ" },
    desc: { en: "Share your needs via WhatsApp, phone, or our online form.", bn: "WhatsApp, ফোন বা অনলাইন ফর্মে আপনার প্রয়োজন জানান।" },
  },
  {
    icon: FileSearch,
    title: { en: "Proposal & Quote", bn: "প্রস্তাব ও কোটেশন" },
    desc: { en: "We analyze requirements and send a clear timeline and pricing.", bn: "আমরা প্রয়োজন বিশ্লেষণ করে স্পষ্ট টাইমলাইন ও মূল্য পাঠাই।" },
  },
  {
    icon: Rocket,
    title: { en: "Delivery", bn: "ডেলিভারি" },
    desc: { en: "Products shipped or projects built with regular progress updates.", bn: "পণ্য পাঠানো বা প্রজেক্ট নিয়মিত আপডেট সহ তৈরি।" },
  },
  {
    icon: Headphones,
    title: { en: "Support", bn: "সাপোর্ট" },
    desc: { en: "After-sales support, warranty, and ongoing maintenance available.", bn: "বিক্রয়োত্তর সাপোর্ট, ওয়ারেন্টি ও রক্ষণাবেক্ষণ।" },
  },
];

export default function ProcessTimeline() {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <section className="enterprise-section">
      <div className="container mx-auto px-4">
        <SectionHeader
          badge={lang === "bn" ? "কিভাবে কাজ করে" : "How It Works"}
          title={lang === "bn" ? "আমাদের প্রক্রিয়া" : "Our Process"}
          subtitle={lang === "bn" ? "সহজ ৪ ধাপে আপনার সমাধান পান" : "Get your solution in 4 simple steps"}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title.en} className="relative enterprise-card p-6 text-center">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mx-auto mb-4 mt-2">
                  <Icon className="w-6 h-6 text-brand-600 dark:text-brand-300" />
                </div>
                <h3 className="font-bold text-heading mb-2">{t(step.title)}</h3>
                <p className="text-sm text-muted leading-relaxed">{t(step.desc)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
