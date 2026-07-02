"use client";

import { useEffect, useRef, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getApiBaseUrl } from "@/lib/apiBase";
import BrandLogo from "@/components/ui/BrandLogo";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getAdaptiveTimeout } from "@/lib/networkAwareApi";
import { isConstrainedNetwork, isOffline } from "@/lib/networkStatus";
import {
  DEFAULT_WARMUP_CONTENT,
  parseWarmupContent,
  type WarmupContent,
  type WarmupTrustIndicator,
} from "@/lib/warmupContent";

const API_BASE = getApiBaseUrl();

type ReadyState = {
  health: boolean;
  products: boolean;
  services: boolean;
  settings: boolean;
  appState: boolean;
};

const TRUST_ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  package: Package,
  briefcase: Briefcase,
  "shield-check": ShieldCheck,
};

function resolveTrustIcon(key: string): LucideIcon {
  return TRUST_ICON_MAP[key] ?? ShieldCheck;
}

const SHOWCASE_ROTATION_MS = 2000;
const FEATURED_ROTATION_MS = 3000;
const REVIEW_ROTATION_MS = 4000;
const MIN_DISPLAY_MS =
  typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent) ? 0 : 2500;
const WARMED_SESSION_KEY = "abo_warmup_ready";

function getHealthTimeoutMs() {
  return getAdaptiveTimeout(15000);
}

function getApiTimeoutMs() {
  return getAdaptiveTimeout(12000);
}

function getWarmupPollMs() {
  if (isOffline()) return 5000;
  if (isConstrainedNetwork()) return 4500;
  return 2200;
}

function getWarmupRetryMs() {
  if (isOffline()) return 5000;
  if (isConstrainedNetwork()) return 5000;
  return 2500;
}

function getMaxBlockingMs() {
  if (isOffline()) return 4000;
  if (isConstrainedNetwork()) return 10000;
  return 15000;
}

function getLoadingStatus(lang: "bn" | "en", state: ReadyState): string {
  if (!state.health) return lang === "bn" ? "নিরাপদ সার্ভার চালু হচ্ছে..." : "Starting secure server...";
  if (!state.products) return lang === "bn" ? "পণ্য লোড হচ্ছে..." : "Loading products...";
  if (!state.services) return lang === "bn" ? "সেবা প্রস্তুত হচ্ছে..." : "Preparing services...";
  return lang === "bn" ? "প্রায় প্রস্তুত..." : "Almost ready...";
}

async function checkEndpoint(path: string, timeoutMs = getApiTimeoutMs()): Promise<boolean> {
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

async function fetchSettingsEndpoint(timeoutMs = getApiTimeoutMs()): Promise<{ ok: boolean; data: Record<string, string> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/api/v1/settings`, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return { ok: false, data: {} };
    const json = await res.json();
    const data: Record<string, string> = json?.data ?? {};
    return { ok: true, data };
  } catch {
    return { ok: false, data: {} };
  } finally {
    clearTimeout(timer);
  }
}

export default function ApiWarmup() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const isHome = pathname === "/";
  const warmedRef = useRef(false);
  const [warming, setWarming] = useState(
    () => !(typeof window !== "undefined" && sessionStorage.getItem(WARMED_SESSION_KEY) === "1")
  );
  const [dismissed, setDismissed] = useState(false);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [content, setContent] = useState<WarmupContent>(DEFAULT_WARMUP_CONTENT);
  const [readyState, setReadyState] = useState<ReadyState>({
    health: false,
    products: false,
    services: false,
    settings: false,
    appState: false,
  });
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem(WARMED_SESSION_KEY) === "1") {
      warmedRef.current = true;
    }
    if (warmedRef.current) {
      setWarming(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setReadyState((prev) => ({ ...prev, appState: document.readyState !== "loading" }));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (warmedRef.current) return;

    let alive = true;
    let nextPoll: ReturnType<typeof setTimeout> | undefined;
    let readyTimer: ReturnType<typeof setTimeout> | undefined;

    const finishWarmup = () => {
      warmedRef.current = true;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(WARMED_SESSION_KEY, "1");
      }
      setWarming(false);
    };

    const poll = async () => {
      const [healthOk, productsOk, servicesOk, settingsResult] = await Promise.all([
        checkEndpoint("/health", getHealthTimeoutMs()),
        checkEndpoint("/api/v1/products?per_page=1", getApiTimeoutMs()),
        checkEndpoint("/api/v1/services?per_page=1", getApiTimeoutMs()),
        fetchSettingsEndpoint(getApiTimeoutMs()),
      ]);

      if (!alive) return;

      // Update warmup content from settings when available
      if (settingsResult.ok && Object.keys(settingsResult.data).length > 0) {
        setContent(parseWarmupContent(settingsResult.data));
      }

      setReadyState((prev) => {
        const next = {
          health: prev.health || healthOk,
          products: prev.products || productsOk,
          services: prev.services || servicesOk,
          settings: prev.settings || settingsResult.ok,
          appState: prev.appState || document.readyState !== "loading",
        };
        if (next.health && next.products && next.services && next.settings && next.appState) {
          const elapsed = Date.now() - startedAtRef.current;
          const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);
          if (delay === 0) finishWarmup();
          else {
            readyTimer = setTimeout(() => {
              readyTimer = undefined;
              finishWarmup();
            }, delay);
          }
        } else {
          nextPoll = setTimeout(poll, getWarmupPollMs());
        }
        return next;
      });
    };

    poll().catch(() => {
      if (alive) nextPoll = setTimeout(poll, getWarmupRetryMs());
    });

    return () => {
      alive = false;
      if (nextPoll) clearTimeout(nextPoll);
      if (readyTimer) clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    if (!warming || dismissed) return;
    const timer = setTimeout(() => {
      setDismissed(true);
    }, getMaxBlockingMs());
    return () => clearTimeout(timer);
  }, [warming, dismissed]);

  useEffect(() => {
    if (!warming || dismissed) return;
    const showcaseTimer = setInterval(() => {
      setShowcaseIndex((v) => (v + 1) % content.businessShowcase.length);
    }, SHOWCASE_ROTATION_MS);
    const featuredTimer = setInterval(() => {
      setFeaturedIndex((v) => (v + 1) % content.featuredCarousel.length);
    }, FEATURED_ROTATION_MS);
    const reviewTimer = setInterval(() => {
      setReviewIndex((v) => (v + 1) % content.reviewHighlights.length);
    }, REVIEW_ROTATION_MS);
    return () => {
      clearInterval(showcaseTimer);
      clearInterval(featuredTimer);
      clearInterval(reviewTimer);
    };
  }, [warming, dismissed, content]);

  const currentStatus = getLoadingStatus(lang, readyState);

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

  const showcase = content.businessShowcase[showcaseIndex % content.businessShowcase.length];
  const featured = content.featuredCarousel[featuredIndex % content.featuredCarousel.length];
  const review = content.reviewHighlights[reviewIndex % content.reviewHighlights.length];

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
                    {BRAND_NAME}
                  </p>
                  <h1 className="text-xl sm:text-2xl font-bold text-heading">
                    {lang === "bn" ? content.welcomeBn : content.welcomeEn}
                  </h1>
                  <p className="text-sm text-muted">
                    {lang === "bn" ? content.subtitleBn : content.subtitleEn}
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
                {content.trustIndicators.map((indicator: WarmupTrustIndicator) => {
                  const Icon = resolveTrustIcon(indicator.icon);
                  return (
                    <div key={indicator.en} className="glass rounded-xl p-3">
                      <Icon className="w-4 h-4 text-brand-500 mb-1" aria-hidden />
                      <p className="text-sm font-bold text-heading">{indicator.value}</p>
                      <p className="text-[11px] text-muted">{lang === "bn" ? indicator.bn : indicator.en}</p>
                    </div>
                  );
                })}
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
                  {lang === "bn" ? "আজকের অফার" : "Today's Offer"}
                </p>
                <p className="text-sm font-medium text-heading">
                  {lang === "bn" ? content.offerBn : content.offerEn}
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
