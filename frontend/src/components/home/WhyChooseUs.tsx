"use client";

import { Award, Shield, Tag, Truck, Lock, Headphones } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

const REASONS = [
  {
    icon: Award,
    title: { en: "Multi-Vertical Expertise", bn: "বহুমুখী দক্ষতা" },
    desc: { en: "One team handling products, printing, legal and software services.", bn: "এক টিমে পণ্য, প্রিন্টিং, আইনি ও সফটওয়্যার সেবা।" },
  },
  {
    icon: Shield,
    title: { en: "Reliable Quality", bn: "নির্ভরযোগ্য মান" },
    desc: { en: "Consistent quality standards across products and services.", bn: "পণ্য ও সেবা জুড়ে একই মান নিয়ন্ত্রণ।" },
  },
  {
    icon: Tag,
    title: { en: "Value Pricing", bn: "ভ্যালু প্রাইসিং" },
    desc: { en: "Transparent and practical pricing for growing businesses.", bn: "বর্ধনশীল ব্যবসার জন্য স্বচ্ছ ও বাস্তবসম্মত মূল্য।" },
  },
  {
    icon: Truck,
    title: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" },
    desc: { en: "Responsive delivery and service follow-up from Sylhet.", bn: "সিলেট থেকে দ্রুত ডেলিভারি ও সার্ভিস ফলো-আপ।" },
  },
  {
    icon: Lock,
    title: { en: "Secure Operations", bn: "নিরাপদ অপারেশন" },
    desc: { en: "Customer payments, data and documents are handled with care.", bn: "গ্রাহকের পেমেন্ট, ডেটা ও ডকুমেন্ট নিরাপদভাবে পরিচালিত হয়।" },
  },
  {
    icon: Headphones,
    title: { en: "Dedicated Support", bn: "ডেডিকেটেড সাপোর্ট" },
    desc: { en: "Quick guidance for orders, services and project queries.", bn: "অর্ডার, সেবা ও প্রজেক্টে দ্রুত সহায়তা।" },
  },
];

export default function WhyChooseUs() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "কেন ABO Enterprise?" : "Why Choose ABO Enterprise?"}</h2>
          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REASONS.map(({ icon: Icon, title, desc }) => (
            <GlassCard key={title.en} hover className="p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="font-bold text-heading mb-2 text-sm">
                {lang === "bn" ? title.bn : title.en}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {lang === "bn" ? desc.bn : desc.en}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
