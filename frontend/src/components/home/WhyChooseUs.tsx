"use client";

import { CheckCircle, Clock, Headphones, Award, Lock, TrendingUp } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const REASONS = [
  {
    icon: Award,
    title: { en: "Enterprise Quality", bn: "এন্টারপ্রাইজ মান" },
    desc: {
      en: "Every product and service meets international quality standards.",
      bn: "প্রতিটি পণ্য ও সেবা আন্তর্জাতিক মান বজায় রাখে।",
    },
  },
  {
    icon: Clock,
    title: { en: "Fast Delivery", bn: "দ্রুত ডেলিভারি" },
    desc: {
      en: "Same-day delivery in Sylhet. Nationwide within 2-3 days.",
      bn: "সিলেটে একই দিনে, সারাদেশে ২–৩ দিনে ডেলিভারি।",
    },
  },
  {
    icon: Headphones,
    title: { en: "24/7 WhatsApp Support", bn: "সার্বক্ষণিক সাপোর্ট" },
    desc: {
      en: "Get instant support via WhatsApp anytime you need.",
      bn: "যেকোনো সময় WhatsApp-এ তাৎক্ষণিক সাপোর্ট পান।",
    },
  },
  {
    icon: Lock,
    title: { en: "100% Secure", bn: "১০০% নিরাপদ" },
    desc: {
      en: "Safe payments via bKash, Rocket, and bank transfer.",
      bn: "bKash, Rocket ও ব্যাংক ট্রান্সফারে নিরাপদ পেমেন্ট।",
    },
  },
  {
    icon: TrendingUp,
    title: { en: "AI-Powered Solutions", bn: "AI-চালিত সমাধান" },
    desc: {
      en: "First in Bangladesh to offer AI solutions for local businesses.",
      bn: "স্থানীয় ব্যবসার জন্য AI সমাধান প্রদানে বাংলাদেশে অগ্রগামী।",
    },
  },
  {
    icon: CheckCircle,
    title: { en: "Money-Back Guarantee", bn: "মানি ব্যাক গ্যারান্টি" },
    desc: {
      en: "Not satisfied? Get a full refund within 7 days.",
      bn: "সন্তুষ্ট না হলে ৭ দিনের মধ্যে সম্পূর্ণ ফেরত।",
    },
  },
];

export default function WhyChooseUs() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "কেন আমাদের বেছে নেবেন?" : "Why Choose Us?"}</h2>
          <div className="section-divider" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REASONS.map(({ icon: Icon, title, desc }) => (
            <div key={title.en} className="card p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-sm">
                {lang === "bn" ? title.bn : title.en}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {lang === "bn" ? desc.bn : desc.en}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
