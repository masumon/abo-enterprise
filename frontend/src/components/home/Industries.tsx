"use client";
import Link from "next/link";
import { useLanguageStore } from "@/store/language";

const INDUSTRIES = [
  { emoji: "🛒", label: { en: "Retail",       bn: "রিটেইল" },       desc: { en: "POS + Inventory", bn: "POS + ইনভেন্টরি" } },
  { emoji: "🍽",  label: { en: "Restaurant",   bn: "রেস্টুরেন্ট" },  desc: { en: "Order + Kitchen", bn: "অর্ডার + কিচেন" } },
  { emoji: "🏗",  label: { en: "Construction", bn: "কনস্ট্রাকশন" },  desc: { en: "Project tracking", bn: "প্রজেক্ট ট্র্যাকিং" } },
  { emoji: "🏥",  label: { en: "Hospital",     bn: "হাসপাতাল" },     desc: { en: "Patient + Billing", bn: "রোগী + বিলিং" } },
  { emoji: "🏫",  label: { en: "Education",    bn: "শিক্ষা" },       desc: { en: "School + College", bn: "স্কুল + কলেজ" } },
  { emoji: "🏢",  label: { en: "Corporate",    bn: "কর্পোরেট" },     desc: { en: "ERP + CRM", bn: "ERP + CRM" } },
  { emoji: "🌐",  label: { en: "ISP",          bn: "ISP" },          desc: { en: "Billing + Management", bn: "বিলিং + ম্যানেজমেন্ট" } },
  { emoji: "🤖",  label: { en: "AI / Tech",    bn: "AI / টেক" },     desc: { en: "Automation + ML", bn: "অটোমেশন + ML" } },
];

export default function Industries() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "আমরা কোন কোন ইন্ডাস্ট্রিতে কাজ করি?" : "Industries We Serve"}
          </h2>
          <p className="text-gray-500 text-sm">
            {lang === "bn"
              ? "বিভিন্ন ইন্ডাস্ট্রির জন্য কাস্টম সমাধান।"
              : "Tailored solutions for every industry."}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {INDUSTRIES.map((ind) => (
            <Link key={ind.label.en} href="/projects"
              className="group border border-gray-100 rounded-2xl p-5 text-center hover:border-brand-200 hover:shadow-lg hover:bg-brand-50/30 transition-all">
              <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{ind.emoji}</span>
              <h3 className="font-bold text-gray-900 text-sm mb-1">
                {lang === "bn" ? ind.label.bn : ind.label.en}
              </h3>
              <p className="text-gray-400 text-xs">{lang === "bn" ? ind.desc.bn : ind.desc.en}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
