"use client";
import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const CASES = [
  {
    emoji: "🏪",
    client: { en: "Sylhet Retail Shop", bn: "সিলেট রিটেইল শপ" },
    problem: { en: "Manual billing causing errors & slow service", bn: "ম্যানুয়াল বিলিং-এ ভুল ও ধীর সেবা" },
    solution: { en: "Custom POS System with inventory tracking", bn: "কাস্টম POS সিস্টেম ও ইনভেন্টরি ট্র্যাকিং" },
    result: { en: "50% faster billing, 0 errors", bn: "৫০% দ্রুত বিলিং, ০ ভুল" },
    tag: { en: "POS System", bn: "POS সিস্টেম" },
    color: "border-blue-200 bg-blue-50/30",
    tagColor: "bg-blue-100 text-blue-700",
  },
  {
    emoji: "🏥",
    client: { en: "Local Clinic, Sylhet", bn: "স্থানীয় ক্লিনিক, সিলেট" },
    problem: { en: "Patient records lost, billing delays", bn: "রোগীর তথ্য হারিয়ে যাচ্ছিল, বিলিং বিলম্ব" },
    solution: { en: "Hospital Management System (HMS)", bn: "হাসপাতাল ম্যানেজমেন্ট সিস্টেম (HMS)" },
    result: { en: "100% digital records, 3x faster billing", bn: "১০০% ডিজিটাল রেকর্ড, ৩x দ্রুত বিলিং" },
    tag: { en: "Hospital Software", bn: "হাসপাতাল সফটওয়্যার" },
    color: "border-green-200 bg-green-50/30",
    tagColor: "bg-green-100 text-green-700",
  },
  {
    emoji: "🌐",
    client: { en: "E-Commerce Brand", bn: "ই-কমার্স ব্র্যান্ড" },
    problem: { en: "No online presence, losing customers", bn: "অনলাইনে উপস্থিতি নেই, কাস্টমার হারাচ্ছিল" },
    solution: { en: "Full website + AI chatbot integration", bn: "সম্পূর্ণ ওয়েবসাইট + AI চ্যাটবট ইন্টিগ্রেশন" },
    result: { en: "200% more leads in 3 months", bn: "৩ মাসে ২০০% বেশি লিড" },
    tag: { en: "Web + AI", bn: "ওয়েব + AI" },
    color: "border-purple-200 bg-purple-50/30",
    tagColor: "bg-purple-100 text-purple-700",
  },
];

export default function Portfolio() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full mb-3">
            {lang === "bn" ? "✅ সফল প্রজেক্ট" : "✅ Case Studies"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "আমাদের সাফল্যের গল্প" : "Our Success Stories"}
          </h2>
          <p className="text-gray-500 text-sm">
            {lang === "bn" ? "বাস্তব সমস্যা → কাস্টম সমাধান → পরিমাপযোগ্য ফলাফল" : "Real problems → Custom solutions → Measurable results"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {CASES.map((c) => (
            <div key={c.client.en} className={`rounded-2xl border-2 ${c.color} p-6 space-y-4`}>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{c.emoji}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.tagColor}`}>
                  {lang === "bn" ? c.tag.bn : c.tag.en}
                </span>
              </div>
              <h3 className="font-bold text-gray-900">{lang === "bn" ? c.client.bn : c.client.en}</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold text-red-600 text-xs uppercase">❌ {lang === "bn" ? "সমস্যা" : "Problem"}</span>
                  <p className="text-gray-600 mt-0.5">{lang === "bn" ? c.problem.bn : c.problem.en}</p>
                </div>
                <div>
                  <span className="font-semibold text-blue-600 text-xs uppercase">🔧 {lang === "bn" ? "সমাধান" : "Solution"}</span>
                  <p className="text-gray-600 mt-0.5">{lang === "bn" ? c.solution.bn : c.solution.en}</p>
                </div>
                <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                  <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-semibold text-green-700 text-sm">{lang === "bn" ? c.result.bn : c.result.en}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/projects" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700">
            {lang === "bn" ? "আপনার প্রজেক্ট শেয়ার করুন" : "Start your project"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
