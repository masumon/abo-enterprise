"use client";
import Link from "next/link";
import { ArrowRight, Cloud } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

const SOLUTIONS = [
  { emoji: "🏭", title: { en: "ERP", bn: "ERP" }, desc: { en: "Enterprise resource planning", bn: "এন্টারপ্রাইজ রিসোর্স প্ল্যানিং" } },
  { emoji: "🏪", title: { en: "POS", bn: "POS" }, desc: { en: "Point of sale & billing", bn: "পয়েন্ট অফ সেল ও বিলিং" } },
  { emoji: "👥", title: { en: "HRM", bn: "HRM" }, desc: { en: "Human resource management", bn: "মানব সম্পদ ব্যবস্থাপনা" } },
  { emoji: "📊", title: { en: "Accounting", bn: "অ্যাকাউন্টিং" }, desc: { en: "Finance & ledger system", bn: "অর্থ ও হিসাব ব্যবস্থা" } },
  { emoji: "🤝", title: { en: "CRM", bn: "CRM" }, desc: { en: "Customer relationship management", bn: "গ্রাহক সম্পর্ক ব্যবস্থাপনা" } },
  { emoji: "⚙️", title: { en: "Automation", bn: "অটোমেশন" }, desc: { en: "Workflow & process automation", bn: "ওয়ার্কফ্লো অটোমেশন" } },
  { emoji: "🤖", title: { en: "AI Solutions", bn: "AI সমাধান" }, desc: { en: "Chatbots, OCR & intelligence", bn: "চ্যাটবট, OCR ও বুদ্ধিমত্তা" } },
  { emoji: "☁️", title: { en: "Cloud Solutions", bn: "ক্লাউড সমাধান" }, desc: { en: "Deploy, scale & manage cloud", bn: "ক্লাউড ডিপ্লয় ও স্কেলিং" } },
];

export default function SoftwareSolutions() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-16 gradient-surface">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full mb-3">
            {lang === "bn" ? "💼 ব্যবসায়িক সমাধান" : "💼 Business Solutions"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "এন্টারপ্রাইজ সেবা" : "Enterprise Services"}
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            {lang === "bn"
              ? "ERP থেকে AI — আপনার ব্যবসার ডিজিটাল অবকাঠামো।"
              : "From ERP to AI — your business digital infrastructure."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOLUTIONS.map((s) => (
            <Link key={s.title.en} href="/projects">
              <GlassCard hover className="p-5 h-full flex items-start gap-3 group">
                <span className="text-2xl flex-shrink-0">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">
                    {lang === "bn" ? s.title.bn : s.title.en}
                  </h3>
                  <p className="text-gray-500 text-xs mt-1">{lang === "bn" ? s.desc.bn : s.desc.en}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 flex-shrink-0 transition-all" />
              </GlassCard>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/projects" className="btn btn-brand btn-lg btn-ripple">
            <Cloud className="w-5 h-5" />
            {lang === "bn" ? "ফ্রি কোটেশন নিন" : "Get Free Quote"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
