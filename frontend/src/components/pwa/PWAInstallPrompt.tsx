"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandAppIcon } from "@/components/ui/BrandLogo";
import { X, Download, ChevronUp, Smartphone } from "lucide-react";
import { SITE_URL } from "@/lib/tokens";
import { useLanguageStore } from "@/store/language";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Never cover checkout / payment / success pages — the full-screen overlay
// blocks taps mid-checkout and hides the invoice on the success screen.
const SUPPRESSED_ROUTES = ["/checkout", "/order-success", "/booking-success", "/payment", "/admin"];

const REMIND_KEY = "pwa_remind_until";
const INSTALLED_KEY = "pwa_installed";
const MINIMIZED_KEY = "pwa_minimized_session";
const REMIND_DAYS = 7;
const SHOW_DELAY_MS = 3500;
const SITE_HOST = new URL(SITE_URL).hostname;

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export default function PWAInstallPrompt() {
  const { lang } = useLanguageStore();
  const pathname = usePathname();
  const bn = lang === "bn";
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "full" | "minimized">("hidden");
  const [installing, setInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      localStorage.setItem(INSTALLED_KEY, "1");
      return;
    }
    if (localStorage.getItem(INSTALLED_KEY) === "1") return;

    const remindUntil = parseInt(localStorage.getItem(REMIND_KEY) ?? "0", 10);
    if (remindUntil > Date.now()) return;

    const ios = isIOS();
    setIsIos(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const minimized = sessionStorage.getItem(MINIMIZED_KEY) === "1";
    const timer = setTimeout(() => {
      setMode(minimized ? "minimized" : "full");
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const hide = () => setMode("hidden");

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") localStorage.setItem(INSTALLED_KEY, "1");
      setDeferredPrompt(null);
      setInstalling(false);
      hide();
      return;
    }
    if (isIos) {
      hide();
    }
  };

  const handleNotNow = () => {
    sessionStorage.setItem(MINIMIZED_KEY, "1");
    setMode("minimized");
  };

  const handleRemindLater = () => {
    localStorage.setItem(REMIND_KEY, String(Date.now() + REMIND_DAYS * 86400000));
    hide();
  };

  if (mode === "hidden") return null;
  if (SUPPRESSED_ROUTES.some((p) => pathname?.startsWith(p))) return null;

  const labels = {
    title: bn ? "ABO Enterprise অ্যাপ" : "ABO Enterprise App",
    sub: bn ? "হোম স্ক্রিনে যোগ করুন — দ্রুত অ্যাক্সেস" : "Add to home screen for quick access",
    install: bn ? "ইনস্টল করুন" : "Install",
    notNow: bn ? "এখন নয়" : "Not now",
    remind: bn ? "পরবর্তীতে মনে করিয়ে দিন" : "Remind me later",
    iosHint: bn ? "Share → Add to Home Screen" : "Share → Add to Home Screen",
    chip: bn ? "অ্যাপ ইনস্টল" : "Install app",
    installing: bn ? "ইনস্টল হচ্ছে…" : "Installing…",
  };

  if (mode === "minimized") {
    return (
      <button
        type="button"
        onClick={() => setMode("full")}
        className="fixed bottom-[calc(var(--mobile-chrome-bottom)+0.5rem)] left-4 z-[65] flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-600 text-white text-xs font-semibold shadow-lg shadow-brand-900/30 hover:bg-brand-500 transition-colors lg:bottom-6"
        aria-label={labels.chip}
      >
        <Smartphone className="w-3.5 h-3.5" />
        {labels.chip}
        <ChevronUp className="w-3.5 h-3.5 opacity-80" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-[64] backdrop-blur-[2px]" onClick={handleNotNow} aria-hidden />

      <div
        role="dialog"
        aria-labelledby="pwa-prompt-title"
        className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up pb-mobile-nav lg:pb-4 px-4"
      >
        <div className="surface-card rounded-t-2xl shadow-2xl px-5 pt-4 pb-6 max-w-md mx-auto relative border border-brand-100/20">
          <button
            type="button"
            onClick={handleNotNow}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-700"
            aria-label={labels.notNow}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-3 pr-8">
            <BrandAppIcon size={48} className="!rounded-xl ring-2 ring-brand-100" />
            <div>
              <p id="pwa-prompt-title" className="font-bold text-heading text-sm">
                {labels.title}
              </p>
              <p className="text-xs text-muted">{SITE_HOST} · {labels.sub}</p>
            </div>
          </div>

          {(deferredPrompt || isIos) && (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="w-full btn btn-brand btn-md mb-3"
            >
              <Download className="w-4 h-4" />
              {installing ? labels.installing : labels.install}
            </button>
          )}

          {isIos && !deferredPrompt && (
            <p className="text-xs text-center text-muted mb-3">{labels.iosHint}</p>
          )}

          {!deferredPrompt && !isIos && (
            <p className="text-xs text-center text-muted mb-3">
              {bn ? "ব্রাউজার মেনু → Install app / Add to Home Screen" : 'Browser menu → "Install app"'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleNotNow} className="btn btn-ghost btn-sm text-muted">
              {labels.notNow}
            </button>
            <button type="button" onClick={handleRemindLater} className="btn btn-outline btn-sm border-brand-200 text-brand-700">
              {labels.remind}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
