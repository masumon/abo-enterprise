"use client";

import Link from "next/link";
import { ShoppingBag, Wrench, Laptop } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const CATEGORIES = [
  {
    id: "shop",
    icon: ShoppingBag,
    color: "text-accent-600 dark:text-accent-400",
    bgColor: "bg-accent-50 dark:bg-accent-500/10",
    label: { en: "Shop", bn: "দোকান" },
    href: "/products",
    blurb: { en: "Accessories, gadgets & electronics", bn: "এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স" },
  },
  {
    id: "services",
    icon: Wrench,
    color: "text-brand-600 dark:text-brand-400",
    bgColor: "bg-brand-50 dark:bg-brand-500/10",
    label: { en: "Services", bn: "সেবা" },
    href: "/services",
    blurb: { en: "Passport, NID, printing, repairs", bn: "পাসপোর্ট, NID, প্রিন্টিং, সার্ভিসিং" },
  },
  {
    id: "software",
    icon: Laptop,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    label: { en: "Software", bn: "সফটওয়্যার" },
    href: "/projects",
    blurb: { en: "POS, ERP, AI & custom software", bn: "POS, ERP, AI ও কাস্টম সফটওয়্যার" },
  },
];

export default function CategoryCards() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-6 sm:py-8 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {CATEGORIES.map(({ id, icon: Icon, color, bgColor, label, href, blurb }) => (
            <Link
              key={id}
              href={href}
              className="group flex flex-col items-center text-center gap-2 p-3 sm:p-5 rounded-2xl border border-[var(--line)] hover:border-brand-300 dark:hover:border-brand-600/50 bg-white dark:bg-white/5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl ${bgColor} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${color}`} strokeWidth={2} aria-hidden />
              </span>
              <span className="text-xs sm:text-base font-bold text-heading leading-tight">
                {lang === "bn" ? label.bn : label.en}
              </span>
              <span className="text-[10px] sm:text-xs text-[var(--ink-muted)] line-clamp-1 group-hover:text-[var(--ink)] transition-colors">
                {lang === "bn" ? blurb.bn : blurb.en}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
