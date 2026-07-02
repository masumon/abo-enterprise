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
  if (!state.products) return lang === "bn" ? "পণ্য প্রস্তুত হচ্ছে..." : "Preparing products...";
  if (!state.services) return lang === "bn" ? "সেবা লোড হচ্ছে..." : "Loading services...";
  if (!state.settings) return lang === "bn" ? "ডেটাবেজ সংযুক্ত হচ্ছে..." : "Connecting database...";
  return lang === "bn" ? "প্রায় প্রস্তুত..." : "Almost ready...";
}

function getLoadingProgress(state: ReadyState): number {
  const flags = [state.health, state.products, state.services, state.settings, state.appState];
  const done = flags.filter(Boolean).length;
  return Math.min(12 + (done / flags.length) * 82, 94);
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
  const [exiting, setExiting] = useState(false);
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
  const prevWarmingRef = useRef(warming);

  // Exit animation when warmup completes
  useEffect(() => {
    if (prevWarmingRef.current && !warming && !exiting && isHome && !dismissed) {
      setExiting(true);
      const t = setTimeout(() => setExiting(false), 550);
      return () => clearTimeout(t);
    }
    prevWarmingRef.current = warming;
  }, [warming, exiting, isHome, dismissed]);

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
  const loadingProgress = getLoadingProgress(readyState);

  if (!warming && !exiting) return null;

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
    <div
      className={cn(
        "fixed inset-0 z-[75] welcome-overlay overflow-hidden",
        exiting && "animate-welcome-exit"
      )}
      role="region"
      aria-label={lang === "bn" ? "স্বাগত অভিজ্ঞতা" : "Welcome experience"}
    >
      {/* ── Ambient background orbs ── */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full bg-brand-700/25 blur-[100px] animate-orb-drift-1" />
        <div className="absolute top-1/4 -right-40 w-[480px] h-[480px] rounded-full bg-accent-600/18 blur-[110px] animate-orb-drift-2" />
        <div className="absolute -bottom-40 left-1/3 w-[520px] h-[520px] rounded-full bg-emerald-700/12 blur-[120px] animate-orb-drift-3" />
        {/* Subtle radial grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* ── Scrollable content ── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl">
          {/* ── Glass container ── */}
          <div className="welcome-glass rounded-3xl overflow-hidden">

            {/* ─── Header ─── */}
            <div className="px-6 sm:px-8 pt-7 sm:pt-8 pb-6 border-b border-white/[0.07]">
              <div className="flex items-start justify-between gap-4 mb-4">
                {/* Logo + Brand */}
                <div className="flex items-center gap-3.5">
                  {/* Animated logo */}
                  <div className="relative flex-shrink-0 animate-fade-in">
                    <BrandLogo size="xl" variant="glass" priority />
                    <span
                      aria-hidden
                      className="absolute -inset-2 rounded-[22px] border border-brand-400/35 animate-glow-breathe"
                    />
                    <span
                      aria-hidden
                      className="absolute -inset-3.5 rounded-[26px] border border-brand-500/15 animate-glow-breathe"
                      style={{ animationDelay: "0.8s" }}
                    />
                  </div>
                  {/* Brand text */}
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-[0.22em] text-brand-300/75 font-semibold mb-0.5 animate-fade-up"
                      style={{ animationDelay: "0.1s" }}
                    >
                      {BRAND_NAME}
                    </p>
                    <h1
                      className="text-xl sm:text-2xl font-bold text-white leading-tight animate-fade-up"
                      style={{ animationDelay: "0.18s" }}
                    >
                      {lang === "bn" ? content.welcomeBn : content.welcomeEn}
                    </h1>
                    <p
                      className="text-sm text-white/55 mt-0.5 animate-fade-up"
                      style={{ animationDelay: "0.26s" }}
                    >
                      {lang === "bn" ? content.subtitleBn : content.subtitleEn}
                    </p>
                  </div>
                </div>
                {/* Live badge */}
                <div
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full animate-fade-in"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    animationDelay: "0.3s",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                  <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wide">LIVE</span>
                </div>
              </div>
            </div>

            {/* ─── Body ─── */}
            <div className="px-6 sm:px-8 py-5 space-y-4">

              {/* Business showcase */}
              <div
                className="welcome-inner-card-accent rounded-2xl px-5 py-4 animate-fade-up"
                style={{ animationDelay: "0.32s" }}
              >
                <p className="text-[9px] uppercase tracking-[0.2em] text-brand-300/65 mb-2 font-semibold">
                  {lang === "bn" ? "আমরা যা প্রদান করি" : "What We Offer"}
                </p>
                <div className="flex items-center gap-2.5 min-h-7">
                  <Sparkles className="w-4 h-4 text-brand-300/80 flex-shrink-0" aria-hidden />
                  <span
                    key={showcaseIndex}
                    className="text-white font-semibold text-base sm:text-lg leading-tight animate-blur-in-up"
                  >
                    {lang === "bn" ? showcase.bn : showcase.en}
                  </span>
                </div>
                {/* Progress dots */}
                <div className="flex gap-1.5 mt-3" aria-hidden>
                  {content.businessShowcase.map((_, i) => (
                    <span
                      key={i}
                      className={i === showcaseIndex ? "welcome-dot-active" : "welcome-dot-inactive"}
                    />
                  ))}
                </div>
              </div>

              {/* Trust indicators */}
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up"
                style={{ animationDelay: "0.42s" }}
              >
                {content.trustIndicators.map((indicator: WarmupTrustIndicator) => {
                  const Icon = resolveTrustIcon(indicator.icon);
                  return (
                    <div key={indicator.en} className="welcome-inner-card rounded-xl px-3 py-3.5 text-center">
                      <Icon className="w-4 h-4 text-brand-300/80 mx-auto mb-1.5" aria-hidden />
                      <p className="text-white font-bold text-xl leading-none tabular-nums">
                        {indicator.value}
                      </p>
                      <p className="text-white/45 text-[10px] mt-1 leading-tight">
                        {lang === "bn" ? indicator.bn : indicator.en}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Featured · Review · Offer */}
              <div
                className="grid sm:grid-cols-3 gap-3 animate-fade-up"
                style={{ animationDelay: "0.52s" }}
              >
                {/* Featured */}
                <div className="welcome-inner-card rounded-xl p-3.5">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-brand-300/60 mb-2 font-semibold">
                    {lang === "bn" ? "ফিচার্ড" : "Featured"}
                  </p>
                  <div className="flex items-start gap-2">
                    <ShoppingBag
                      className={cn(
                        "w-3.5 h-3.5 mt-0.5 flex-shrink-0",
                        featured.type === "service" ? "text-accent-400" : "text-brand-300"
                      )}
                      aria-hidden
                    />
                    <p
                      key={featuredIndex}
                      className="text-white/85 text-xs font-medium leading-snug animate-fade-in"
                    >
                      {lang === "bn" ? featured.bn : featured.en}
                    </p>
                  </div>
                </div>

                {/* Review */}
                <div className="welcome-inner-card rounded-xl p-3.5">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-brand-300/60 mb-2 font-semibold">
                    {lang === "bn" ? "গ্রাহক মতামত" : "Review"}
                  </p>
                  <p
                    key={reviewIndex}
                    className="text-white/75 text-xs leading-relaxed line-clamp-2 animate-fade-in"
                  >
                    {lang === "bn" ? review.bn : review.en}
                  </p>
                  <p className="text-white/35 text-[9px] mt-1.5">— {review.by}</p>
                </div>

                {/* Today's offer */}
                <div className="welcome-inner-card-offer rounded-xl p-3.5 relative overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-accent-500/12 blur-2xl"
                  />
                  <p className="text-[9px] uppercase tracking-[0.18em] text-accent-300/75 mb-2 font-semibold relative">
                    {lang === "bn" ? "আজকের অফার" : "Today's Offer"}
                  </p>
                  <p className="text-white/88 text-xs font-medium leading-snug relative">
                    {lang === "bn" ? content.offerBn : content.offerEn}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Footer: loading status ─── */}
            <div
              className="px-6 sm:px-8 pb-6 sm:pb-7 pt-4 border-t border-white/[0.06] animate-fade-up"
              style={{ animationDelay: "0.6s" }}
            >
              {/* Progress bar */}
              <div className="welcome-progress-bar mb-3">
                <div
                  className="welcome-progress-fill"
                  style={{ width: `${loadingProgress}%` }}
                  role="progressbar"
                  aria-valuenow={loadingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div
                  className="flex items-center gap-2"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2 className="w-3.5 h-3.5 text-brand-300/80 animate-spin flex-shrink-0" aria-hidden />
                  <p className="text-xs text-white/55">{currentStatus}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white/90 transition-all duration-200 hover:bg-white/8"
                  style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  {lang === "bn" ? "এড়িয়ে যান" : "Continue now"}
                  <ArrowRight className="w-3 h-3" aria-hidden />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
