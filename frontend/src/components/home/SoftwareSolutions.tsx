"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const SOLUTIONS = [
  { emoji: "🏪", title: { en: "Retail POS",        bn: "রিটেইল POS" },       desc: { en: "Sales, inventory & receipt printing", bn: "বিক্রয়, ইনভেন্টরি ও রসিদ প্রিন্ট" } },
  { emoji: "🍽",  title: { en: "Restaurant POS",    bn: "রেস্টুরেন্ট POS" },  desc: { en: "Order management & kitchen display",  bn: "অর্ডার ম্যানেজমেন্ট ও কিচেন ডিসপ্লে" } },
  { emoji: "🏭",  title: { en: "ERP System",        bn: "ERP সিস্টেম" },      desc: { en: "Full enterprise resource planning",   bn: "সম্পূর্ণ এন্টারপ্রাইজ রিসোর্স প্ল্যানিং" } },
  { emoji: "👥",  title: { en: "CRM Software",      bn: "CRM সফটওয়্যার" },   desc: { en: "Customer management & follow-ups",   bn: "কাস্টমার ম্যানেজমেন্ট ও ফলো-আপ" } },
  { emoji: "📦",  title: { en: "Inventory System",  bn: "ইনভেন্টরি সিস্টেম" },desc: { en: "Stock tracking & auto-reorder",      bn: "স্টক ট্র্যাকিং ও অটো রিঅর্ডার" } },
  { emoji: "🏥",  title: { en: "Hospital Management",bn:"হাসপাতাল ম্যানেজমেন্ট"},desc:{en:"Patient, doctor & billing system",    bn: "রোগী, ডাক্তার ও বিলিং সিস্টেম" } },
  { emoji: "🏫",  title: { en: "School Management", bn: "স্কুল ম্যানেজমেন্ট" },desc:{ en: "Students, fees & result system",     bn: "ছাত্র, ফি ও ফলাফল সিস্টেম" } },
  { emoji: "🌐",  title: { en: "ISP Billing",       bn: "ISP বিলিং" },        desc: { en: "Internet service billing & management",bn:"ইন্টারনেট সেবা বিলিং ও ম্যানেজমেন্ট"} },
  { emoji: "🤖",  title: { en: "AI Chatbot",        bn: "AI চ্যাটবট" },       desc: { en: "24/7 customer support automation",   bn: "২৪/৭ গ্রাহক সেবা অটোমেশন" } },
];

export default function SoftwareSolutions() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full mb-3">
            {lang === "bn" ? "💼 ব্যবসায়িক সমাধান" : "💼 Business Solutions"}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {lang === "bn" ? "আপনার ব্যবসার জন্য সফটওয়্যার" : "Software for Your Business"}
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            {lang === "bn"
              ? "কাস্টম সফটওয়্যার থেকে AI অটোমেশন — আপনার ব্যবসাকে ডিজিটাল করুন।"
              : "From custom software to AI automation — digitize your business with us."}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOLUTIONS.map((s) => (
            <Link key={s.title.en} href="/projects"
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-purple-200 transition-all group flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">{s.emoji}</span>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                  {lang === "bn" ? s.title.bn : s.title.en}
                </h3>
                <p className="text-gray-500 text-xs mt-1">{lang === "bn" ? s.desc.bn : s.desc.en}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 ml-auto flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/projects" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors shadow-lg">
            {lang === "bn" ? "কাস্টম সমাধান নিন" : "Get Custom Solution"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
