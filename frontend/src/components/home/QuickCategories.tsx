"use client";
import Link from "next/link";
import { useLanguageStore } from "@/store/language";

const CATEGORIES = [
  { emoji: "📱", label: { en: "Phone Case", bn: "ফোন কেস" }, href: "/products?category=accessories", bg: "bg-blue-50 dark:bg-blue-900/25", text: "text-blue-700 dark:text-blue-300", border: "border-blue-100 dark:border-blue-800/40" },
  { emoji: "🔌", label: { en: "Charger", bn: "চার্জার" }, href: "/products?category=accessories", bg: "bg-yellow-50 dark:bg-yellow-900/25", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-100 dark:border-yellow-800/40" },
  { emoji: "🎧", label: { en: "Earbuds", bn: "ইয়ারবাড" }, href: "/products?category=gadgets", bg: "bg-purple-50 dark:bg-purple-900/25", text: "text-purple-700 dark:text-purple-300", border: "border-purple-100 dark:border-purple-800/40" },
  { emoji: "🔋", label: { en: "Power Bank", bn: "পাওয়ার ব্যাংক" }, href: "/products?category=gadgets", bg: "bg-green-50 dark:bg-green-900/25", text: "text-green-700 dark:text-green-300", border: "border-green-100 dark:border-green-800/40" },
  { emoji: "🖨", label: { en: "Printing", bn: "প্রিন্টিং" }, href: "/services/printing", bg: "bg-orange-50 dark:bg-orange-900/25", text: "text-orange-700 dark:text-orange-300", border: "border-orange-100 dark:border-orange-800/40" },
  { emoji: "⚖", label: { en: "Legal", bn: "আইনি" }, href: "/services/legal", bg: "bg-red-50 dark:bg-red-900/25", text: "text-red-700 dark:text-red-300", border: "border-red-100 dark:border-red-800/40" },
  { emoji: "💻", label: { en: "Software", bn: "সফটওয়্যার" }, href: "/services/software", bg: "bg-indigo-50 dark:bg-indigo-900/25", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-100 dark:border-indigo-800/40" },
  { emoji: "🛒", label: { en: "All Shop", bn: "সব পণ্য" }, href: "/products", bg: "bg-gray-50 dark:bg-white/5", text: "text-gray-700 dark:text-gray-300", border: "border-gray-200 dark:border-white/10" },
];

export default function QuickCategories() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-10 section-panel border-b border-gray-100 dark:border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => (
            <Link key={cat.label.en} href={cat.href}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${cat.bg} ${cat.border} hover:shadow-md hover:-translate-y-0.5 transition-all group`}>
              <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
              <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${cat.text}`}>
                {lang === "bn" ? cat.label.bn : cat.label.en}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
