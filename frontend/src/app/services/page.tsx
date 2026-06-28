"use client";

import Link from "next/link";
import { Printer, Scale, Code2, Megaphone, Briefcase, Building2, ArrowRight, CheckCircle, Bot, Cog, Smartphone } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const SERVICES = [
  {
    icon: Printer,
    title: { en: "Printing Services", bn: "প্রিন্টিং সেবা" },
    subtitle: { en: "Professional quality, fast turnaround", bn: "পেশাদার মান, দ্রুত ডেলিভারি" },
    href: "/services/printing",
    color: "brand",
    features: {
      en: ["Business cards (500 pcs from ৳350)", "Banners & flex printing", "Brochures & flyers", "Legal documents & certificates", "Stickers & labels", "Letterheads & envelopes"],
      bn: ["বিজনেস কার্ড (৫০০ পিস ৳৩৫০ থেকে)", "ব্যানার ও ফ্লেক্স প্রিন্ট", "ব্রোশিওর ও ফ্লায়ার", "আইনি ডকুমেন্ট", "স্টিকার ও লেবেল", "লেটারহেড ও খাম"],
    },
    cta: { en: "Book Printing Service", bn: "প্রিন্টিং বুক করুন" },
  },
  {
    icon: Scale,
    title: { en: "Legal Assistance", bn: "আইনি সহায়তা" },
    subtitle: { en: "Government documents & legal filings", bn: "সরকারি ডকুমেন্ট ও আইনি কাজ" },
    href: "/services/legal",
    color: "accent",
    features: {
      en: ["GD filing", "FIR applications", "Legal application drafting", "Complaint letters", "Government documents", "Police station assistance"],
      bn: ["জিডি ফাইলিং", "এফআইআর আবেদন", "আইনি আবেদন প্রস্তুতি", "অভিযোগ পত্র", "সরকারি ডকুমেন্ট", "থানা সহায়তা"],
    },
    cta: { en: "Get Legal Help", bn: "আইনি সহায়তা নিন" },
  },
  {
    icon: Code2,
    title: { en: "Software Development", bn: "সফটওয়্যার ডেভেলপমেন্ট" },
    subtitle: { en: "Web, mobile & enterprise solutions", bn: "ওয়েব, মোবাইল ও এন্টারপ্রাইজ সমাধান" },
    href: "/services/software",
    color: "green",
    features: {
      en: ["Business websites & e-commerce", "AI-powered solutions", "Python automation", "ERP, POS & CRM", "Mobile & desktop apps", "DevOps & cloud"],
      bn: ["ব্যবসায়িক ওয়েবসাইট ও ই-কমার্স", "AI সমাধান", "পাইথন অটোমেশন", "ERP, POS ও CRM", "মোবাইল ও ডেস্কটপ অ্যাপ", "DevOps ও ক্লাউড"],
    },
    cta: { en: "Discuss Your Project", bn: "প্রজেক্ট আলোচনা করুন" },
  },
  {
    icon: Megaphone,
    title: { en: "Digital Marketing", bn: "ডিজিটাল মার্কেটিং" },
    subtitle: { en: "Social media, SEO & online growth", bn: "সোশ্যাল মিডিয়া, SEO ও অনলাইন প্রচার" },
    href: "/contact",
    color: "orange",
    features: {
      en: ["Social media management", "SEO & Google ranking", "Facebook & Instagram ads", "Content creation", "Brand strategy", "Analytics & reporting"],
      bn: ["সোশ্যাল মিডিয়া ম্যানেজমেন্ট", "SEO ও গুগল র‍্যাঙ্কিং", "ফেসবুক ও ইনস্টাগ্রাম বিজ্ঞাপন", "কন্টেন্ট তৈরি", "ব্র্যান্ড কৌশল", "অ্যানালিটিক্স ও রিপোর্ট"],
    },
    cta: { en: "Grow Your Business", bn: "ব্যবসা বাড়ান" },
  },
  {
    icon: Briefcase,
    title: { en: "Business Consulting", bn: "ব্যবসায়িক পরামর্শ" },
    subtitle: { en: "Strategy, planning & digital transformation", bn: "কৌশল, পরিকল্পনা ও ডিজিটাল রূপান্তর" },
    href: "/contact",
    color: "indigo",
    features: {
      en: ["Business strategy", "Digital transformation", "Process optimization", "Market analysis", "Startup guidance", "Growth planning"],
      bn: ["ব্যবসায়িক কৌশল", "ডিজিটাল রূপান্তর", "প্রক্রিয়া অপ্টিমাইজেশন", "বাজার বিশ্লেষণ", "স্টার্টআপ গাইডেন্স", "প্রবৃদ্ধি পরিকল্পনা"],
    },
    cta: { en: "Book Consultation", bn: "পরামর্শ বুক করুন" },
  },
  {
    icon: Building2,
    title: { en: "Enterprise Solutions", bn: "এন্টারপ্রাইজ সমাধান" },
    subtitle: { en: "ERP, POS, CRM & custom systems", bn: "ERP, POS, CRM ও কাস্টম সিস্টেম" },
    href: "/projects",
    color: "brand",
    features: {
      en: ["Custom ERP systems", "POS for retail & restaurants", "CRM & lead management", "Inventory management", "AI automation", "Cloud deployment"],
      bn: ["কাস্টম ERP সিস্টেম", "রিটেইল ও রেস্টুরেন্ট POS", "CRM ও লিড ম্যানেজমেন্ট", "ইনভেন্টরি ম্যানেজমেন্ট", "AI অটোমেশন", "ক্লাউড ডিপ্লয়মেন্ট"],
    },
    cta: { en: "Explore Solutions", bn: "সমাধান দেখুন" },
  },
];

const COLOR_MAP: Record<string, string> = {
  brand: "bg-brand-600",
  accent: "bg-accent-500",
  green: "bg-green-600",
  orange: "bg-orange-500",
  indigo: "bg-indigo-600",
};

export default function ServicesPage() {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t({ en: "Our Services", bn: "আমাদের সেবা" })}</h1>
          <p className="text-xl text-brand-100 max-w-2xl mx-auto">
            {t({ en: "From printing to legal help to full-stack software — everything under one roof.", bn: "প্রিন্টিং থেকে আইনি সহায়তা ও সফটওয়্যার — সব এক ছাদের নিচে।" })}
          </p>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto space-y-8">
          {SERVICES.map(({ icon: Icon, title, subtitle, href, color, features, cta }) => (
            <div key={title.en} className="card overflow-hidden">
              <div className="grid md:grid-cols-5 gap-0">
                <div className={`md:col-span-2 p-8 ${COLOR_MAP[color] ?? "bg-brand-600"} text-white`}>
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t(title)}</h2>
                  <p className="text-white/80 mb-8">{t(subtitle)}</p>
                  <Link href={href} className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 text-sm">
                    {t(cta)} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="md:col-span-3 p-8">
                  <h3 className="font-semibold text-gray-900 mb-5">{t({ en: "What's included:", bn: "যা পাবেন:" })}</h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {(lang === "bn" ? features.bn : features.en).map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">{t({ en: "Powered by Modern Technology", bn: "আধুনিক প্রযুক্তিতে পরিচালিত" })}</h2>
          <div className="flex justify-center gap-6 flex-wrap mt-6">
            {[Bot, Code2, Cog, Smartphone].map((Icon, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                <Icon className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium">{["AI", "Web", "Automation", "Mobile"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
