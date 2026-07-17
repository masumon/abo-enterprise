"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { useLanguageStore } from "@/store/language";

const STORAGE_KEY = "abo-cookie-consent-v2";

interface ConsentState {
  status: "accepted" | "rejected" | "custom" | "dismissed";
  analytics: boolean;
  marketing: boolean;
  updated_at: string;
}

function saveConsent(status: ConsentState["status"], analytics: boolean, marketing: boolean) {
  const payload: ConsentState = {
    status,
    analytics,
    marketing,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export default function CookieConsent() {
  const { lang } = useLanguageStore();
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }

    try {
      const parsed = JSON.parse(raw) as ConsentState;
      if (parsed.status === "dismissed") return;
      setVisible(false);
    } catch {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    saveConsent("accepted", true, true);
    setVisible(false);
  };

  const rejectOptional = () => {
    saveConsent("rejected", false, false);
    setVisible(false);
  };

  const saveCustom = () => {
    saveConsent("custom", analyticsEnabled, marketingEnabled);
    setVisible(false);
  };

  const dismiss = () => {
    saveConsent("dismissed", analyticsEnabled, marketingEnabled);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
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
              ? "আমরা প্রয়োজনীয় কুকি সবসময় ব্যবহার করি। বিশ্লেষণ ও মার্কেটিং কুকি আপনি নিয়ন্ত্রণ করতে পারবেন।"
              : "We always use essential cookies. You can choose analytics and marketing cookies."}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <button type="button" onClick={acceptAll} className="btn btn-brand btn-sm">
              {lang === "bn" ? "সব অনুমতি দিন" : "Accept all"}
            </button>
            <button type="button" onClick={rejectOptional} className="btn btn-outline btn-sm">
              {lang === "bn" ? "ঐচ্ছিক কুকি বন্ধ" : "Reject optional"}
            </button>
            <button type="button" onClick={() => setShowCustomize((v) => !v)} className="btn btn-ghost btn-sm text-xs">
              {lang === "bn" ? "কাস্টমাইজ" : "Customize"}
            </button>
          </div>
          {showCustomize && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2 mb-2 text-xs">
              <label className="flex items-center justify-between gap-3">
                <span>{lang === "bn" ? "Analytics কুকি" : "Analytics cookies"}</span>
                <input type="checkbox" checked={analyticsEnabled} onChange={(e) => setAnalyticsEnabled(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>{lang === "bn" ? "Marketing কুকি" : "Marketing cookies"}</span>
                <input type="checkbox" checked={marketingEnabled} onChange={(e) => setMarketingEnabled(e.target.checked)} />
              </label>
              <button type="button" onClick={saveCustom} className="btn btn-brand btn-sm w-full">
                {lang === "bn" ? "পছন্দ সংরক্ষণ" : "Save preferences"}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Link href="/legal/privacy" className="btn btn-ghost btn-sm text-xs">
              {lang === "bn" ? "আরও জানুন" : "Learn more"}
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
          aria-label={lang === "bn" ? "পরবর্তীতে" : "Dismiss for now"}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
