"use client";

import { useLanguageStore } from "@/store/language";

export default function SkipToContent() {
  const { lang } = useLanguageStore();

  return (
    <a
      href="#page-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:text-sm focus:font-semibold focus:shadow-lg"
    >
      {lang === "bn" ? "মূল বিষয়বস্তুতে যান" : "Skip to main content"}
    </a>
  );
}
