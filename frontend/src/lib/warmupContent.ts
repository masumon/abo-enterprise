// Setting keys for admin-configurable warmup screen content
export const WARMUP_BUSINESS_SHOWCASE_KEY = "warmup_business_showcase_json";
export const WARMUP_TRUST_INDICATORS_KEY = "warmup_trust_indicators_json";
export const WARMUP_FEATURED_CAROUSEL_KEY = "warmup_featured_carousel_json";
export const WARMUP_REVIEW_HIGHLIGHTS_KEY = "warmup_review_highlights_json";
export const WARMUP_WELCOME_EN_KEY = "warmup_welcome_en";
export const WARMUP_WELCOME_BN_KEY = "warmup_welcome_bn";
export const WARMUP_SUBTITLE_EN_KEY = "warmup_subtitle_en";
export const WARMUP_SUBTITLE_BN_KEY = "warmup_subtitle_bn";
export const WARMUP_OFFER_EN_KEY = "warmup_offer_en";
export const WARMUP_OFFER_BN_KEY = "warmup_offer_bn";

export interface WarmupShowcaseItem {
  en: string;
  bn: string;
}

export interface WarmupTrustIndicator {
  value: string;
  /** Lucide icon key: "users" | "package" | "briefcase" | "shield-check" */
  icon: string;
  en: string;
  bn: string;
}

export interface WarmupFeaturedItem {
  type: "service" | "product";
  en: string;
  bn: string;
}

export interface WarmupReviewItem {
  en: string;
  bn: string;
  by: string;
}

export interface WarmupContent {
  businessShowcase: WarmupShowcaseItem[];
  trustIndicators: WarmupTrustIndicator[];
  featuredCarousel: WarmupFeaturedItem[];
  reviewHighlights: WarmupReviewItem[];
  welcomeEn: string;
  welcomeBn: string;
  subtitleEn: string;
  subtitleBn: string;
  offerEn: string;
  offerBn: string;
}

export const DEFAULT_WARMUP_CONTENT: WarmupContent = {
  businessShowcase: [
    { en: "Loading live business data", bn: "লাইভ ব্যবসার ডেটা লোড হচ্ছে" },
  ],
  trustIndicators: [
    { value: "--", icon: "users", en: "Syncing", bn: "সিঙ্ক হচ্ছে" },
  ],
  featuredCarousel: [
    { type: "service", en: "Loading live featured items", bn: "লাইভ ফিচারড আইটেম লোড হচ্ছে" },
  ],
  reviewHighlights: [
    {
      en: "\u201cLive customer feedback is loading.\u201d",
      bn: "\u201cলাইভ কাস্টমার ফিডব্যাক লোড হচ্ছে।\u201d",
      by: "ABO Enterprise",
    },
  ],
  welcomeEn: "Loading...",
  welcomeBn: "লোড হচ্ছে...",
  subtitleEn: "Fetching live content from server.",
  subtitleBn: "সার্ভার থেকে লাইভ কনটেন্ট আনা হচ্ছে।",
  offerEn: "Refreshing with live data.",
  offerBn: "লাইভ ডেটা দিয়ে রিফ্রেশ করা হচ্ছে।",
};

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function str(raw: string | undefined, fallback: string): string {
  return raw?.trim() || fallback;
}

/** Parse warmup-specific keys from the public settings map. Falls back to defaults for missing/invalid values. */
export function parseWarmupContent(settings: Record<string, string>): WarmupContent {
  const d = DEFAULT_WARMUP_CONTENT;
  return {
    businessShowcase: parseJsonArray<WarmupShowcaseItem>(
      settings[WARMUP_BUSINESS_SHOWCASE_KEY],
      d.businessShowcase
    ),
    trustIndicators: parseJsonArray<WarmupTrustIndicator>(
      settings[WARMUP_TRUST_INDICATORS_KEY],
      d.trustIndicators
    ),
    featuredCarousel: parseJsonArray<WarmupFeaturedItem>(
      settings[WARMUP_FEATURED_CAROUSEL_KEY],
      d.featuredCarousel
    ),
    reviewHighlights: parseJsonArray<WarmupReviewItem>(
      settings[WARMUP_REVIEW_HIGHLIGHTS_KEY],
      d.reviewHighlights
    ),
    welcomeEn: str(settings[WARMUP_WELCOME_EN_KEY], d.welcomeEn),
    welcomeBn: str(settings[WARMUP_WELCOME_BN_KEY], d.welcomeBn),
    subtitleEn: str(settings[WARMUP_SUBTITLE_EN_KEY], d.subtitleEn),
    subtitleBn: str(settings[WARMUP_SUBTITLE_BN_KEY], d.subtitleBn),
    offerEn: str(settings[WARMUP_OFFER_EN_KEY], d.offerEn),
    offerBn: str(settings[WARMUP_OFFER_BN_KEY], d.offerBn),
  };
}
