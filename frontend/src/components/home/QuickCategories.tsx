"use client";
import Link from "next/link";
import { useLanguageStore } from "@/store/language";

const CATEGORIES = [
  { emoji: "📱", label: { en: "Phone Case", bn: "ফোন কেস" }, href: "/products?category=accessories", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
  { emoji: "🔌", label: { en: "Charger", bn: "চার্জার" }, href: "/products?category=accessories", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-100" },
  { emoji: "🎧", label: { en: "Earbuds", bn: "ইয়ারবাড" }, href: "/products?category=gadgets", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-100" },
  { emoji: "🔋", label: { en: "Power Bank", bn: "পাওয়ার ব্যাংক" }, href: "/products?category=gadgets", bg: "bg-green-50", text: "text-green-700", border: "border-green-100" },
  { emoji: "🖨", label: { en: "Printing", bn: "প্রিন্টিং" }, href: "/services/printing", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-100" },
  { emoji: "⚖", label: { en: "Legal", bn: "আইনি" }, href: "/services/legal", bg: "bg-red-50", text: "text-red-700", border: "border-red-100" },
  { emoji: "💻", label: { en: "Software", bn: "সফটওয়্যার" }, href: "/services/software", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  { emoji: "🛒", label: { en: "All Shop", bn: "সব পণ্য" }, href: "/products", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
];

export default function QuickCategories() {
  const { lang } = useLanguageStore();
  return (
    <section className="py-10 bg-white border-b border-gray-100">
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
