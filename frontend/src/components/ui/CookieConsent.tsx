"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const STORAGE_KEY = "abo-cookie-consent";

export default function CookieConsent() {
  const { lang } = useLanguageStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={lang === "bn" ? "কুকি সম্মতি" : "Cookie consent"}
      className="fixed bottom-mobile-float lg:bottom-6 left-4 right-4 lg:left-auto lg:right-24 lg:max-w-md z-40 animate-slide-up"
    >
      <div className="enterprise-card p-4 sm:p-5 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
          <Cookie className="w-5 h-5 text-brand-600 dark:text-brand-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-heading mb-1">
            {lang === "bn" ? "কুকি ও গোপনীয়তা" : "Cookies & Privacy"}
          </p>
          <p className="text-xs text-muted leading-relaxed mb-3">
            {lang === "bn"
              ? "আমরা আপনার অভিজ্ঞতা উন্নত করতে কুকি ব্যবহার করি। চালিয়ে যাওয়ার মানে আপনি আমাদের নীতিতে সম্মত।"
              : "We use cookies to improve your experience. By continuing, you agree to our privacy policy."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={accept} className="btn btn-brand btn-sm">
              {lang === "bn" ? "সম্মত" : "Accept"}
            </button>
            <Link href="/legal/privacy" className="btn btn-ghost btn-sm text-xs">
              {lang === "bn" ? "আরও জানুন" : "Learn more"}
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={accept}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
