"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandAppIcon } from "@/components/ui/BrandLogo";
import { X, Download } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { hasBottomActionBar } from "@/lib/actionBarRoutes";
import { canInstall, triggerInstall } from "@/lib/pwaInstall";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Never show on checkout / payment / success pages or in the admin.
const SUPPRESSED_ROUTES = ["/checkout", "/order-success", "/booking-success", "/payment", "/sumon"];

const REMIND_KEY = "pwa_remind_until";
const INSTALLED_KEY = "pwa_installed";
const FIRST_VISIT_KEY = "pwa_first_seen_at";
const PAGEVIEWS_KEY = "pwa_session_pageviews";
/** After "পরে" / close the card stays away this long. */
const SNOOZE_DAYS = 14;
/**
 * The card is a small, non-blocking banner (no page dim/blur) and appears only
 * after real engagement: a minimum time on site AND either a second page view
 * in this session or scrolling more than one screen.
 */
const SHOW_DELAY_MS = 15_000;
const FIRST_VISIT_ENGAGED_MS = 45_000;

// Storage can throw (private mode, blocked site data) — never let it break the page.
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string) {
  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
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
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [eligible, setEligible] = useState(false);
  const timeReached = useRef(false);
  const engaged = useRef(false);

  // Count page views in this session (a second page view = engagement).
  useEffect(() => {
    const n = parseInt(ssGet(PAGEVIEWS_KEY) ?? "0", 10) + 1;
    ssSet(PAGEVIEWS_KEY, String(n));
    if (n >= 2) engaged.current = true;
  }, [pathname]);

  useEffect(() => {
    if (isStandalone()) {
      lsSet(INSTALLED_KEY, "1");
      return;
    }
    if (lsGet(INSTALLED_KEY) === "1") return;
    if (parseInt(lsGet(REMIND_KEY) ?? "0", 10) > Date.now()) return;

    setIsIos(isIOS());
    setEligible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const maybeShow = () => {
      if (timeReached.current && engaged.current) setVisible(true);
    };
    const onScroll = () => {
      if (window.scrollY > window.innerHeight) {
        engaged.current = true;
        maybeShow();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const now = Date.now();
    const firstSeenAt = parseInt(lsGet(FIRST_VISIT_KEY) ?? "0", 10);
    const isReturningVisitor = firstSeenAt > 0 && now - firstSeenAt > 60_000;
    if (!firstSeenAt) lsSet(FIRST_VISIT_KEY, String(now));

    const timer = setTimeout(() => {
      timeReached.current = true;
      maybeShow();
    }, isReturningVisitor ? SHOW_DELAY_MS : FIRST_VISIT_ENGAGED_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  // A route change after the timer counts as engagement too.
  useEffect(() => {
    if (eligible && timeReached.current && engaged.current) setVisible(true);
  }, [pathname, eligible]);

  const snooze = () => {
    lsSet(REMIND_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
    setVisible(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") lsSet(INSTALLED_KEY, "1");
        else snooze();
      } catch { /* ignore */ }
      setDeferredPrompt(null);
      setInstalling(false);
      setVisible(false);
      return;
    }
    // The shared module may have captured the event before this component mounted.
    if (canInstall("customer")) {
      setInstalling(true);
      const outcome = await triggerInstall("customer");
      setInstalling(false);
      if (outcome === "accepted") lsSet(INSTALLED_KEY, "1");
      else snooze();
      setVisible(false);
    }
  };

  if (!visible) return null;
  if (SUPPRESSED_ROUTES.some((p) => pathname?.startsWith(p))) return null;
  // Pages with their own bottom action bar (cart, product, booking) stay clean.
  if (hasBottomActionBar(pathname)) return null;

  const nativeAvailable = !!deferredPrompt || canInstall("customer");
  const hint = isIos
    ? bn ? "Share → Add to Home Screen চাপুন" : "Tap Share → Add to Home Screen"
    : nativeAvailable
      ? bn ? "হোম স্ক্রিনে যোগ করুন — দ্রুত অ্যাক্সেস" : "Add to home screen for quick access"
      : bn ? "ব্রাউজার মেনু → Install app" : 'Browser menu → "Install app"';

  return (
    <div
      role="region"
      aria-label={bn ? "অ্যাপ ইনস্টল" : "Install app"}
      className="fixed z-[60] left-3 right-3 bottom-[calc(var(--mobile-chrome-bottom)+0.5rem)] sm:left-auto sm:right-4 sm:w-[22rem] lg:bottom-4 animate-slide-up"
    >
      <div className="surface-card rounded-2xl shadow-lg border border-brand-100/30 dark:border-white/10 flex items-center gap-3 pl-3 pr-1.5 py-2">
        <BrandAppIcon size={36} className="!rounded-lg flex-none" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-heading text-[13px] leading-tight truncate">
            {bn ? "ABO Enterprise অ্যাপ" : "ABO Enterprise App"}
          </p>
          <p className="text-[11px] text-muted leading-snug line-clamp-2">{hint}</p>
        </div>
        {nativeAvailable && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="btn btn-brand btn-sm min-h-[40px] px-3 gap-1 flex-none"
          >
            <Download className="w-3.5 h-3.5" />
            {installing ? (bn ? "হচ্ছে…" : "…") : bn ? "ইনস্টল" : "Install"}
          </button>
        )}
        <button
          type="button"
          onClick={snooze}
          className="flex-none min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full text-muted hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-semibold"
          aria-label={bn ? "পরে (১৪ দিন আর দেখাবে না)" : "Later (hide for 14 days)"}
          title={bn ? "পরে" : "Later"}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
