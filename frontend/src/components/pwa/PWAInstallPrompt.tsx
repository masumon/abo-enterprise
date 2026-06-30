"use client";

import { SITE_URL } from "@/lib/tokens";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Download, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "android" | "ios" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const DISMISSED_KEY = "pwa_prompt_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SITE_HOST = new URL(SITE_URL).hostname;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DURATION_MS) return;

    const p = detectPlatform();
    setPlatform(p);

    if (p === "ios") {
      // Show iOS instructions after 3s
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    } else {
      setInstalling(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up pb-mobile-nav lg:pb-0">
        <div className="surface-card rounded-t-3xl shadow-2xl px-6 pt-5 pb-8 max-w-lg mx-auto border-b-0">
          <div className="w-10 h-1 bg-gray-200 dark:bg-white/20 rounded-full mx-auto mb-5" />

          {/* Close */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"
            aria-label="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
              <Image src="/icons/icon-192.png" alt="ABO Enterprise" width={64} height={64} />
            </div>
            <div>
              <p className="font-bold text-heading text-lg leading-tight">ABO Enterprise</p>
              <p className="text-sm text-muted mt-0.5">{SITE_HOST}</p>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                ))}
                <span className="text-xs text-gray-400 ml-1">অ্যাপ হিসেবে ইনস্টল করুন</span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: "⚡", title: "দ্রুত", desc: "অফলাইনেও কাজ করে" },
              { icon: "🔔", title: "নোটিফিকেশন", desc: "অর্ডার আপডেট পান" },
              { icon: "📱", title: "অ্যাপ অভিজ্ঞতা", desc: "ফুলস্ক্রিন মোড" },
            ].map((b) => (
              <div key={b.title} className="text-center bg-brand-50 dark:bg-brand-900/30 rounded-2xl p-3">
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-xs font-semibold text-brand-700 dark:text-brand-200">{b.title}</p>
                <p className="text-[10px] text-muted mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* iOS instructions */}
          {platform === "ios" ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-heading mb-3">iPhone-এ ইনস্টল করুন:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <Share className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200">নিচের <strong>Share</strong> বাটন চাপুন</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200"><strong>&quot;Add to Home Screen&quot;</strong> সিলেক্ট করুন</p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition-colors mb-3"
            >
              <Download className="w-5 h-5" />
              {installing ? "ইনস্টল হচ্ছে..." : "অ্যাপ ইনস্টল করুন — বিনামূল্যে"}
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="w-full text-center text-sm text-muted py-1"
          >
            এখন নয়
          </button>
        </div>
      </div>
    </>
  );
}
