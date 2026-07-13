"use client";

import { Award, Store, Globe, Wrench, Bot, Truck } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

const REASONS = [
  {
    icon: Award,
    title: { en: "8+ Years Experience", bn: "৮+ বছরের অভিজ্ঞতা" },
    desc: { en: "Nearly a decade serving customers with trust and consistency.", bn: "প্রায় এক দশক ধরে বিশ্বাস ও ধারাবাহিকতার সাথে গ্রাহক সেবা।" },
  },
  {
    icon: Store,
    title: { en: "Trusted Local Business", bn: "বিশ্বস্ত স্থানীয় ব্যবসা" },
    desc: { en: "An established name in Sylhet with a real storefront.", bn: "সিলেটে বাস্তব দোকানসহ একটি প্রতিষ্ঠিত নাম।" },
  },
  {
    icon: Globe,
    title: { en: "Online + Offline Service", bn: "অনলাইন + অফলাইন সেবা" },
    desc: { en: "Visit our shop or order online — the choice is yours.", bn: "দোকানে আসুন বা অনলাইনে অর্ডার করুন — পছন্দ আপনার।" },
  },
  {
    icon: Wrench,
    title: { en: "Experienced Engineers", bn: "অভিজ্ঞ ইঞ্জিনিয়ার" },
    desc: { en: "Skilled technicians for mobile, computer & software work.", bn: "মোবাইল, কম্পিউটার ও সফটওয়্যারের দক্ষ টেকনিশিয়ান।" },
  },
  {
    icon: Bot,
    title: { en: "AI Powered Solutions", bn: "AI চালিত সমাধান" },
    desc: { en: "Modern automation and AI to grow your business.", bn: "আপনার ব্যবসা বাড়াতে আধুনিক অটোমেশন ও AI।" },
  },
  {
    icon: Truck,
    title: { en: "Nationwide Service", bn: "সারাদেশে সেবা" },
    desc: { en: "Products and services delivered across Bangladesh.", bn: "সারা বাংলাদেশে পণ্য ও সেবা পৌঁছে দেওয়া।" },
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
