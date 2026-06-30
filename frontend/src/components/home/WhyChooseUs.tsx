"use client";

import { Award, Shield, Tag, Truck, Lock, Headphones } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

const REASONS = [
  {
    icon: Award,
    title: { en: "Experience", bn: "অভিজ্ঞতা" },
    desc: { en: "Years of trusted service across Bangladesh.", bn: "বাংলাদেশ জুড়ে বছরের অভিজ্ঞতা ও বিশ্বাস।" },
  },
  {
    icon: Shield,
    title: { en: "Quality", bn: "মান" },
    desc: { en: "Premium products and professional delivery.", bn: "প্রিমিয়াম পণ্য ও পেশাদার সেবা।" },
  },
  {
    icon: Tag,
    title: { en: "Affordable Pricing", bn: "সাশ্রয়ী মূল্য" },
    desc: { en: "Best value without compromising quality.", bn: "মান বজায় রেখে সেরা দাম।" },
  },
  {
    icon: Truck,
    title: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" },
    desc: { en: "Same-day in Sylhet, nationwide in 2–3 days.", bn: "সিলেটে একই দিনে, সারাদেশে ২–৩ দিনে।" },
  },
  {
    icon: Lock,
    title: { en: "Security", bn: "নিরাপত্তা" },
    desc: { en: "Secure payments and data protection.", bn: "নিরাপদ পেমেন্ট ও ডেটা সুরক্ষা।" },
  },
  {
    icon: Headphones,
    title: { en: "Customer Support", bn: "গ্রাহক সেবা" },
    desc: { en: "24/7 WhatsApp and phone support.", bn: "২৪/৭ WhatsApp ও ফোন সাপোর্ট।" },
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
