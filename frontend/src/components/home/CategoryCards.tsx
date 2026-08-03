"use client";

import Link from "next/link";
import { ShoppingBag, Wrench, Laptop } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const CATEGORIES = [
  {
    id: "shop",
    icon: ShoppingBag,
    gradient: "from-accent-500 to-amber-500",
    label: { en: "Shop", bn: "দোকান" },
    href: "/products",
    blurb: { en: "Accessories, gadgets & electronics", bn: "এক্সেসরিজ, গ্যাজেট ও ইলেকট্রনিক্স" },
  },
  {
    id: "services",
    icon: Wrench,
    gradient: "from-brand-500 to-blue-500",
    label: { en: "Services", bn: "সেবা" },
    href: "/services",
    blurb: { en: "Passport, NID, printing, repairs", bn: "পাসপোর্ট, NID, প্রিন্টিং, সার্ভিসিং" },
  },
  {
    id: "software",
    icon: Laptop,
    gradient: "from-purple-500 to-fuchsia-500",
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
          {CATEGORIES.map(({ id, icon: Icon, gradient, label, href, blurb }) => (
            <Link
              key={id}
              href={href}
              className="group relative flex flex-col items-center text-center gap-2 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-[var(--line)] hover:border-transparent bg-white dark:bg-white/5 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-300"
            >
              <span className={`w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} shadow-md flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-white" strokeWidth={2} aria-hidden />
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
