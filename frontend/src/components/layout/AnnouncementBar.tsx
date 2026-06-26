"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const ANNOUNCEMENTS = [
  {
    en: "🎉 New AI Solutions available! Get 20% off on first consultation →",
    bn: "🎉 নতুন AI সমাধান এসেছে! প্রথম পরামর্শে ২০% ছাড় পান →",
    href: "/services",
  },
  {
    en: "📦 Free delivery on orders over ৳2000 in Sylhet",
    bn: "📦 সিলেটে ৳২০০০+ অর্ডারে ফ্রি ডেলিভারি",
    href: "/products",
  },
  {
    en: "💼 Custom POS & ERP Software for your business — Book a free demo",
    bn: "💼 আপনার ব্যবসার জন্য কাস্টম POS ও ERP — ফ্রি ডেমো বুক করুন",
    href: "/projects",
  },
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);
  const { lang } = useLanguageStore();

  if (!visible) return null;

  const current = ANNOUNCEMENTS[idx];

  return (
    <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-accent-600 text-white text-xs sm:text-sm relative z-50">
      <div className="container mx-auto px-4 h-9 flex items-center justify-between gap-4">
        {/* Dots */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {ANNOUNCEMENTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === idx ? "bg-white scale-125" : "bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Message */}
        <Link
          href={current.href}
          className="flex-1 text-center font-medium hover:text-white/90 transition-colors flex items-center justify-center gap-2"
        >
          <Zap className="w-3.5 h-3.5 flex-shrink-0 text-yellow-300" />
          <span className="truncate">
            {lang === "bn" ? current.bn : current.en}
          </span>
        </Link>

        {/* Close */}
        <button
          onClick={() => setVisible(false)}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
          aria-label="Close announcement"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
