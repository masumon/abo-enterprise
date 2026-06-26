"use client";
import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";

const INDUSTRIES = [
  { emoji: "🏗", label: { en: "Construction", bn: "নির্মাণ" }, desc: { en: "Project tracking", bn: "প্রজেক্ট ট্র্যাকিং" } },
  { emoji: "🛒", label: { en: "Retail", bn: "রিটেইল" }, desc: { en: "POS + Inventory", bn: "POS + ইনভেন্টরি" } },
  { emoji: "🏫", label: { en: "Education", bn: "শিক্ষা" }, desc: { en: "School management", bn: "স্কুল ম্যানেজমেন্ট" } },
  { emoji: "🏥", label: { en: "Healthcare", bn: "স্বাস্থ্য" }, desc: { en: "Hospital systems", bn: "হাসপাতাল সিস্টেম" } },
  { emoji: "🏭", label: { en: "Manufacturing", bn: "উৎপাদন" }, desc: { en: "ERP + Automation", bn: "ERP + অটোমেশন" } },
  { emoji: "🏢", label: { en: "Corporate", bn: "কর্পোরেট" }, desc: { en: "CRM + HRM", bn: "CRM + HRM" } },
  { emoji: "🤝", label: { en: "NGO", bn: "এনজিও" }, desc: { en: "Donor management", bn: "ডোনার ম্যানেজমেন্ট" } },
  { emoji: "🏛", label: { en: "Government", bn: "সরকারি" }, desc: { en: "Digital services", bn: "ডিজিটাল সেবা" } },
];

export default function Industries() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "যে সেক্টরে আমরা কাজ করি" : "Solutions For Industries"}
          </h2>
          <p className="text-gray-500 text-sm">
            {lang === "bn" ? "প্রতিটি ইন্ডাস্ট্রির জন্য 맞춤 কাস্টম সমাধান।" : "Tailored solutions for every industry sector."}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind) => (
            <Link key={ind.label.en} href="/projects">
              <GlassCard hover className="p-5 text-center h-full group">
                <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{ind.emoji}</span>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{lang === "bn" ? ind.label.bn : ind.label.en}</h3>
                <p className="text-gray-400 text-xs">{lang === "bn" ? ind.desc.bn : ind.desc.en}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
