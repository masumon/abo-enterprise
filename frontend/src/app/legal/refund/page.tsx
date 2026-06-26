"use client";

import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

export default function RefundPage() {
  const { lang } = useLanguageStore();
  const isBn = lang === "bn";

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <GlassCard className="p-8 md:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {isBn ? "রিফান্ড নীতি" : "Refund Policy"}
          </h1>
          <div className="text-gray-600 space-y-4 text-sm leading-relaxed">
            <p>{isBn ? "পণ্যে ত্রুটি থাকলে ৭ দিনের মধ্যে রিফান্ড বা প্রতিস্থাপন করা হয়।" : "Defective products qualify for refund or replacement within 7 days."}</p>
            <p>{isBn ? "কাস্টম প্রিন্টিং ও সফটওয়্যার প্রজেক্টে রিফান্ড প্রজেক্টের অগ্রগতির উপর নির্ভর করে।" : "Custom printing and software project refunds depend on project progress."}</p>
            <p>{isBn ? "রিফান্ডের জন্য অর্ডার নম্বর ও প্রমাণসহ যোগাযোগ করুন।" : "Contact us with order number and proof for refund requests."}</p>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
