"use client";
import Link from "next/link";
import { ShoppingBag, Calendar, Briefcase, ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const ENTRIES = [
  {
    icon: ShoppingBag,
    gradient: "from-blue-600 to-blue-700",
    lightBg: "bg-blue-50",
    lightText: "text-blue-700",
    border: "border-blue-100",
    emoji: "🛒",
      title: { en: "Shop Tech Products", bn: "টেক পণ্য কিনুন" },
      desc: {
        en: "Accessories, gadgets & daily business devices", 
        bn: "অ্যাকসেসরিজ, গ্যাজেট ও ব্যবসায়িক ডিভাইস" 
    },
    cta: { en: "Browse Products", bn: "পণ্য দেখুন" },
    href: "/products",
    tags: [
      { en: "USB Cables", bn: "USB কেবল" },
      { en: "Phone Cases", bn: "ফোন কেস" },
      { en: "Chargers", bn: "চার্জার" },
    ],
  },
  {
    icon: Calendar,
    gradient: "from-green-600 to-emerald-700",
    lightBg: "bg-green-50",
    lightText: "text-green-700",
    border: "border-green-100",
    emoji: "📅",
      title: { en: "Book Service Center", bn: "সার্ভিস সেন্টার বুক করুন" },
      desc: {
        en: "Printing, legal, digital and software support", 
        bn: "প্রিন্টিং, আইনি, ডিজিটাল ও সফটওয়্যার সেবা" 
    },
    cta: { en: "Book a Service", bn: "সেবা বুক করুন" },
    href: "/services",
    tags: [
      { en: "Printing", bn: "প্রিন্টিং" },
      { en: "Legal Writing", bn: "আইনি রাইটিং" },
      { en: "Website", bn: "ওয়েবসাইট" },
    ],
  },
  {
    icon: Briefcase,
    gradient: "from-purple-600 to-violet-700",
    lightBg: "bg-purple-50",
    lightText: "text-purple-700",
    border: "border-purple-100",
    emoji: "💼",
      title: { en: "Business Solutions", bn: "ব্যবসা সমাধান" },
      desc: {
        en: "AI, automation and custom software implementations", 
        bn: "AI, অটোমেশন ও কাস্টম সফটওয়্যার বাস্তবায়ন" 
    },
    cta: { en: "Get a Free Quote", bn: "ফ্রি কোটেশন নিন" },
    href: "/projects",
    tags: [
      { en: "POS System", bn: "POS সিস্টেম" },
      { en: "AI Solutions", bn: "AI সমাধান" },
      { en: "Custom ERP", bn: "কাস্টম ERP" },
    ],
  },
];

export default function EntryPoints() {
  const { lang } = useLanguageStore();

  return (
    <section className="enterprise-section-alt">
      <div className="container mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
            {lang === "bn" ? "আপনি কী খুঁজছেন?" : "What are you looking for?"}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            {lang === "bn"
              ? "নিচের ৩টি পথের যেকোনো একটি বেছে নিন — আমরা বাকি কাজ করব।"
              : "Pick one of the three paths below — we'll take care of the rest."}
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {ENTRIES.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="group card-hover overflow-hidden flex flex-col hover:-translate-y-1.5"
              >
                {/* Card top gradient strip */}
                <div className={`h-1 w-full bg-gradient-to-r ${entry.gradient}`} />

                <div className="p-6 flex flex-col flex-1">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${entry.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-heading mb-2">
                    {lang === "bn" ? entry.title.bn : entry.title.en}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">
                    {lang === "bn" ? entry.desc.bn : entry.desc.en}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag.en}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${entry.lightBg} ${entry.lightText} border ${entry.border}`}
                      >
                        {lang === "bn" ? tag.bn : tag.en}
                      </span>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className={`flex items-center gap-2 font-semibold text-sm ${entry.lightText} group-hover:gap-3 transition-all`}>
                    {lang === "bn" ? entry.cta.bn : entry.cta.en}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
