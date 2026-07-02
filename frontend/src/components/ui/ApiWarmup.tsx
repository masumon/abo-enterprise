"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getApiBaseUrl } from "@/lib/apiBase";
import BrandLogo from "@/components/ui/BrandLogo";
import { cn } from "@/lib/utils";

const API_BASE = getApiBaseUrl();

let warmed = false;

type ReadyState = {
  health: boolean;
  products: boolean;
  services: boolean;
  settings: boolean;
  appState: boolean;
};

const BUSINESS_SHOWCASE = [
  { en: "Mobile Accessories", bn: "মোবাইল এক্সেসরিজ" },
  { en: "Printing Services", bn: "প্রিন্টিং সার্ভিসেস" },
  { en: "Legal Services", bn: "লিগ্যাল সার্ভিসেস" },
  { en: "Digital Services", bn: "ডিজিটাল সার্ভিসেস" },
  { en: "AI Solutions", bn: "AI সলিউশন্স" },
  { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" },
];

const TRUST_INDICATORS = [
  { value: "12k+", icon: Users, en: "Happy Customers", bn: "সন্তুষ্ট গ্রাহক" },
  { value: "850+", icon: Package, en: "Products", bn: "পণ্য" },
  { value: "320+", icon: Briefcase, en: "Business Clients", bn: "ব্যবসায়িক ক্লায়েন্ট" },
  { value: "100%", icon: ShieldCheck, en: "Secure Orders", bn: "নিরাপদ অর্ডার" },
];

const FEATURED_CAROUSEL = [
  { type: "service", en: "Express Printing", bn: "এক্সপ্রেস প্রিন্টিং" },
  { type: "product", en: "Fast-Charge Accessories", bn: "ফাস্ট-চার্জ এক্সেসরিজ" },
  { type: "service", en: "Legal Document Support", bn: "লিগ্যাল ডকুমেন্ট সাপোর্ট" },
  { type: "service", en: "Business AI Automation", bn: "বিজনেস AI অটোমেশন" },
];

const REVIEW_HIGHLIGHTS = [
  {
    en: "“Great quality and fast support. Everything in one platform.”",
    bn: "“দারুণ মান ও দ্রুত সাপোর্ট। এক প্ল্যাটফর্মে সব সমাধান।”",
    by: "Rahim Enterprise",
  },
  {
    en: "“Reliable services with clear communication and secure delivery.”",
    bn: "“বিশ্বাসযোগ্য সেবা, স্পষ্ট যোগাযোগ ও নিরাপদ ডেলিভারি।”",
    by: "Nusrat Traders",
  },
];

async function checkEndpoint(path: string, timeoutMs = 9000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function ApiWarmup() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const isHome = pathname === "/";
  const [warming, setWarming] = useState(!warmed);
  const [dismissed, setDismissed] = useState(false);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [readyState, setReadyState] = useState<ReadyState>({
    health: false,
    products: false,
    services: false,
    settings: false,
    appState: false,
  });

  useEffect(() => {
    if (warmed) {
      setWarming(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setReadyState((prev) => ({ ...prev, appState: document.readyState !== "loading" }));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (warmed) return;

    let alive = true;
    let nextPoll: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const [healthOk, productsOk, servicesOk, settingsOk] = await Promise.all([
        checkEndpoint("/health", 12000),
        checkEndpoint("/api/v1/products?per_page=1", 8000),
        checkEndpoint("/api/v1/services?per_page=1", 8000),
        checkEndpoint("/api/v1/settings", 8000),
      ]);

      if (!alive) return;

      setReadyState((prev) => {
        const next = {
          health: prev.health || healthOk,
          products: prev.products || productsOk,
          services: prev.services || servicesOk,
          settings: prev.settings || settingsOk,
          appState: prev.appState || document.readyState !== "loading",
        };
        if (next.health && next.products && next.services && next.settings && next.appState) {
          warmed = true;
          setWarming(false);
        } else {
          nextPoll = setTimeout(poll, 2200);
        }
        return next;
      });
    };

    poll().catch(() => {
      if (alive) nextPoll = setTimeout(poll, 2500);
    });

    return () => {
      alive = false;
      if (nextPoll) clearTimeout(nextPoll);
    };
  }, []);

  useEffect(() => {
    if (!warming || dismissed) return;
    const showcaseTimer = setInterval(() => {
      setShowcaseIndex((v) => (v + 1) % BUSINESS_SHOWCASE.length);
    }, 1900);
    const featuredTimer = setInterval(() => {
      setFeaturedIndex((v) => (v + 1) % FEATURED_CAROUSEL.length);
    }, 2600);
    const reviewTimer = setInterval(() => {
      setReviewIndex((v) => (v + 1) % REVIEW_HIGHLIGHTS.length);
    }, 3000);
    return () => {
      clearInterval(showcaseTimer);
      clearInterval(featuredTimer);
      clearInterval(reviewTimer);
    };
  }, [warming, dismissed]);

  const currentStatus = !readyState.health
    ? (lang === "bn" ? "নিরাপদ সার্ভার চালু হচ্ছে..." : "Starting secure server...")
    : !readyState.products
      ? (lang === "bn" ? "পণ্য লোড হচ্ছে..." : "Loading products...")
      : !readyState.services
        ? (lang === "bn" ? "সেবা প্রস্তুত হচ্ছে..." : "Preparing services...")
        : (lang === "bn" ? "প্রায় প্রস্তুত..." : "Almost ready...");

  if (!warming) return null;

  if (!isHome || dismissed) {
    return (
      <div
        className="fixed bottom-mobile-float lg:bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:max-w-xs z-30 surface-card backdrop-blur-md rounded-xl px-4 py-3 shadow-lg flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-4 h-4 text-brand-500 animate-spin flex-shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{currentStatus}</p>
          <p className="text-xs text-muted">
            {lang === "bn" ? "আপনি ব্রাউজিং চালিয়ে যেতে পারেন" : "You can continue browsing"}
          </p>
        </div>
      </div>
    );
  }

  const showcase = BUSINESS_SHOWCASE[showcaseIndex];
  const featured = FEATURED_CAROUSEL[featuredIndex];
  const review = REVIEW_HIGHLIGHTS[reviewIndex];

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto gradient-surface">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -left-12 w-44 h-44 rounded-full bg-brand-300/30 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-8 w-40 h-40 rounded-full bg-accent-300/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-10 left-1/4 w-36 h-36 rounded-full bg-brand-500/10 blur-2xl animate-pulse" />
      </div>

      <div className="relative min-h-screen px-4 py-6 sm:py-8 flex items-center justify-center">
        <div className="w-full max-w-4xl glass-panel rounded-3xl p-5 sm:p-7 shadow-glass">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <BrandLogo size="xl" variant="glass" priority />
                  <span className="absolute -inset-1 rounded-full border border-brand-300/50 animate-ping" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
                    ABO Enterprise
                  </p>
                  <h1 className="text-xl sm:text-2xl font-bold text-heading">
                    {lang === "bn" ? "স্বাগতম!" : "Welcome!"}
                  </h1>
                  <p className="text-sm text-muted">
                    {lang === "bn"
                      ? "আপনার ব্যবসার সব সমাধান এক প্ল্যাটফর্মে।"
                      : "All your business solutions in one platform."}
                  </p>
                </div>
              </div>

              <div className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-300 mb-2">
                  {lang === "bn" ? "রোটেটিং বিজনেস শোকেস" : "Rotating Business Showcase"}
                </p>
                <div className="flex items-center gap-2 text-base font-semibold text-heading min-h-7">
                  <Sparkles className="w-4 h-4 text-accent-500 flex-shrink-0" />
                  <span className="transition-all duration-300">{lang === "bn" ? showcase.bn : showcase.en}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {TRUST_INDICATORS.map(({ value, icon: Icon, en, bn }) => (
                  <div key={en} className="glass rounded-xl p-3">
                    <Icon className="w-4 h-4 text-brand-500 mb-1" aria-hidden />
                    <p className="text-sm font-bold text-heading">{value}</p>
                    <p className="text-[11px] text-muted">{lang === "bn" ? bn : en}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-300 mb-2">
                  {lang === "bn" ? "ফিচার্ড ক্যারোসেল" : "Featured Carousel"}
                </p>
                <div className="flex items-center gap-2">
                  <ShoppingBag className={cn("w-4 h-4", featured.type === "service" ? "text-accent-500" : "text-brand-500")} />
                  <p className="font-semibold text-heading">{lang === "bn" ? featured.bn : featured.en}</p>
                </div>
              </div>

              <div className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-300 mb-2">
                  {lang === "bn" ? "গ্রাহক মতামত" : "Customer Highlights"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200 min-h-12">{lang === "bn" ? review.bn : review.en}</p>
                <p className="text-xs text-muted mt-1">— {review.by}</p>
              </div>

              <div className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-brand-600 dark:text-brand-300 mb-1">
                  {lang === "bn" ? "আজকের অফার" : "Today’s Offer"}
                </p>
                <p className="text-sm font-medium text-heading">
                  {lang === "bn"
                    ? "নতুন ক্লায়েন্টদের জন্য ফ্রি বিজনেস কনসাল্টেশন।"
                    : "Free business consultation for new clients today."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand-200/50 dark:border-brand-400/20 pt-4">
            <div className="flex items-center gap-2" role="status" aria-live="polite" aria-busy="true">
              <Loader2 className="w-4 h-4 text-brand-500 animate-spin" aria-hidden />
              <p className="text-sm text-gray-700 dark:text-gray-200">{currentStatus}</p>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="btn btn-glass btn-sm"
            >
              {lang === "bn" ? "সাইটে যান" : "Continue now"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
