"use client";

import Link from "next/link";
import {
  Printer, Scale, Code, Megaphone, Briefcase, Building2, ArrowRight,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

const SERVICES = [
  {
    icon: Printer,
    href: "/services/printing",
    color: "from-purple-500 to-pink-500",
    title: { en: "Printing", bn: "প্রিন্টিং" },
    desc: { en: "Cards, banners, brochures & documents.", bn: "কার্ড, ব্যানার, ব্রোশিওর ও ডকুমেন্ট।" },
  },
  {
    icon: Code,
    href: "/services/software",
    color: "from-green-500 to-teal-500",
    title: { en: "Software", bn: "সফটওয়্যার" },
    desc: { en: "Web, mobile & enterprise applications.", bn: "ওয়েব, মোবাইল ও এন্টারপ্রাইজ অ্যাপ।" },
  },
  {
    icon: Scale,
    href: "/services/legal",
    color: "from-blue-500 to-cyan-500",
    title: { en: "Legal", bn: "আইনি" },
    desc: { en: "GD, FIR & legal document assistance.", bn: "জিডি, এফআইআর ও আইনি ডকুমেন্ট সহায়তা।" },
  },
  {
    icon: Megaphone,
    href: "/services",
    color: "from-orange-500 to-amber-500",
    title: { en: "Digital Marketing", bn: "ডিজিটাল মার্কেটিং" },
    desc: { en: "Social media, SEO & online growth.", bn: "সোশ্যাল মিডিয়া, SEO ও অনলাইন প্রচার।" },
  },
  {
    icon: Briefcase,
    href: "/contact",
    color: "from-indigo-500 to-violet-500",
    title: { en: "Business Consulting", bn: "ব্যবসায়িক পরামর্শ" },
    desc: { en: "Strategy, planning & digital transformation.", bn: "কৌশল, পরিকল্পনা ও ডিজিটাল রূপান্তর।" },
  },
  {
    icon: Building2,
    href: "/projects",
    color: "from-brand-500 to-brand-700",
    title: { en: "Enterprise Solutions", bn: "এন্টারপ্রাইজ সমাধান" },
    desc: { en: "ERP, POS, CRM & custom systems.", bn: "ERP, POS, CRM ও কাস্টম সিস্টেম।" },
  },
];

export default function ServicesOverview() {
  const { lang } = useLanguageStore();

  return (
    <section id="services" className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "মূল সেবাসমূহ" : "Core Services"}</h2>
          <div className="section-divider" />
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            {lang === "bn"
              ? "গ্লাস কার্ডে আমাদের প্রধান সেবা — হোভার করলে বিস্তারিত দেখুন।"
              : "Our core services in premium glass cards — hover to explore."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Link key={service.title.en} href={service.href} className="group">
                <GlassCard hover className="p-6 h-full">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-4 transition-transform duration-300 group-hover:scale-110",
                    service.color
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-heading mb-2">
                    {lang === "bn" ? service.title.bn : service.title.en}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                    {lang === "bn" ? service.desc.bn : service.desc.en}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
                    {lang === "bn" ? "বিস্তারিত" : "Learn more"}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
