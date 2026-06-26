"use client";

import Link from "next/link";
import {
  Printer, Scale, Globe, Bot, Cog, MonitorSmartphone, ArrowRight
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

const SERVICES = [
  {
    icon: Printer,
    href: "/services/printing",
    color: "from-purple-500 to-pink-500",
    title: { en: "Printing Services", bn: "প্রিন্টিং সেবা" },
    desc: {
      en: "Visiting cards, banners, brochures, document printing at the best price.",
      bn: "ভিজিটিং কার্ড, ব্যানার, ব্রোশিওর, ডকুমেন্ট প্রিন্টিং।",
    },
    price: { en: "From ৳3/page", bn: "৳৩/পাতা থেকে" },
  },
  {
    icon: Scale,
    href: "/services/legal",
    color: "from-blue-500 to-cyan-500",
    title: { en: "Legal Case Writing", bn: "আইনি কেস রাইটিং" },
    desc: {
      en: "GD, FIR, and legal application writing with professional assistance.",
      bn: "জিডি, এফআইআর এবং আইনি আবেদন পত্র লেখার সেবা।",
    },
    price: { en: "From ৳500", bn: "৳৫০০ থেকে" },
  },
  {
    icon: Globe,
    href: "/services/software",
    color: "from-green-500 to-teal-500",
    title: { en: "Website Development", bn: "ওয়েবসাইট ডেভেলপমেন্ট" },
    desc: {
      en: "Professional websites, web apps, and e-commerce solutions.",
      bn: "প্রফেশনাল ওয়েবসাইট, ওয়েব অ্যাপ ও ই-কমার্স।",
    },
    price: { en: "Custom quote", bn: "কাস্টম মূল্য" },
  },
  {
    icon: Bot,
    href: "/services/software",
    color: "from-orange-500 to-red-500",
    title: { en: "AI Solutions", bn: "AI সমাধান" },
    desc: {
      en: "Custom AI agents, OCR, automation, and intelligent business solutions.",
      bn: "কাস্টম AI এজেন্ট, OCR, অটোমেশন ও স্মার্ট সমাধান।",
    },
    price: { en: "Project-based", bn: "প্রজেক্ট ভিত্তিক" },
  },
  {
    icon: Cog,
    href: "/services/software",
    color: "from-indigo-500 to-purple-500",
    title: { en: "Python Automation", bn: "পাইথন অটোমেশন" },
    desc: {
      en: "Automate repetitive tasks, data processing, and business workflows.",
      bn: "ব্যবসায়িক কাজ, ডেটা প্রক্রিয়াকরণ স্বয়ংক্রিয় করুন।",
    },
    price: { en: "From ৳5,000", bn: "৳৫,০০০ থেকে" },
  },
  {
    icon: MonitorSmartphone,
    href: "/services/software",
    color: "from-pink-500 to-rose-500",
    title: { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" },
    desc: {
      en: "POS, ERP, CRM, ISP Billing, Hospital, School, Restaurant software.",
      bn: "POS, ERP, CRM, ISP বিলিং, হাসপাতাল, স্কুল সফটওয়্যার।",
    },
    price: { en: "Project-based", bn: "প্রজেক্ট ভিত্তিক" },
  },
];

export default function ServicesOverview() {
  const { lang } = useLanguageStore();

  return (
    <section id="services" className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "আমাদের সেবা" : "Our Services"}</h2>
          <div className="section-divider" />
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            {lang === "bn"
              ? "প্রিন্টিং থেকে AI সমাধান পর্যন্ত — আপনার প্রতিটি ব্যবসায়িক প্রয়োজন আমরা মেটাই।"
              : "From printing to AI solutions — we meet every business need you have."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Link key={service.href + service.title.en} href={service.href}>
                <div className="card-hover p-6 group h-full">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-4 transition-transform duration-200 group-hover:scale-110",
                    service.color
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">
                    {lang === "bn" ? service.title.bn : service.title.en}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                    {lang === "bn" ? service.desc.bn : service.desc.en}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-accent-500">
                      {lang === "bn" ? service.price.bn : service.price.en}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
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
