"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const CATEGORIES = [
  {
    id: "shop",
    emoji: "🛍️",
    label: { en: "Shop", bn: "দোকান" },
    href: "/products",
    blurb: { en: "Accessories, gadgets & electronics", bn: "এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স" },
  },
  {
    id: "services",
    emoji: "🧾",
    label: { en: "Services", bn: "সেবা" },
    href: "/services",
    blurb: { en: "Passport, NID, printing, repairs", bn: "পাসপোর্ট, NID, প্রিন্টিং, সার্ভিসিং" },
  },
  {
    id: "software",
    emoji: "💻",
    label: { en: "Software", bn: "সফটওয়্যার" },
    href: "/projects",
    blurb: { en: "POS, ERP, AI & custom software", bn: "POS, ERP, AI ও কাস্টম সফটওয়্যার" },
  },
];

export default function CategoryCards() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-8 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {CATEGORIES.map(({ id, emoji, label, href, blurb }) => (
            <Link
              key={id}
              href={href}
              className="group flex flex-col items-center justify-center gap-1.5 px-2 sm:px-4 py-4 sm:py-6 rounded-lg border border-[var(--line)] hover:border-brand-300 dark:hover:border-brand-600/50 bg-white dark:bg-white/5 hover:shadow-md transition-all"
            >
              <span className="text-2xl sm:text-3xl" aria-hidden>{emoji}</span>
              <span className="text-xs sm:text-sm font-bold text-center text-heading">
                {lang === "bn" ? label.bn : label.en}
              </span>
              <span className="text-[9px] sm:text-xs text-[var(--ink-muted)] text-center line-clamp-1 group-hover:text-[var(--ink)] transition-colors">
                {lang === "bn" ? blurb.bn : blurb.en}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
