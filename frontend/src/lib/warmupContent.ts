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
    { en: "Mobile Accessories", bn: "মোবাইল এক্সেসরিজ" },
    { en: "Printing Services", bn: "প্রিন্টিং সার্ভিসেস" },
    { en: "Legal Services", bn: "লিগ্যাল সার্ভিসেস" },
    { en: "Digital Services", bn: "ডিজিটাল সার্ভিসেস" },
    { en: "AI Solutions", bn: "AI সলিউশন্স" },
    { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" },
  ],
  trustIndicators: [
    { value: "12k+", icon: "users", en: "Happy Customers", bn: "সন্তুষ্ট গ্রাহক" },
    { value: "850+", icon: "package", en: "Products", bn: "পণ্য" },
    { value: "320+", icon: "briefcase", en: "Business Clients", bn: "ব্যবসায়িক ক্লায়েন্ট" },
    { value: "100%", icon: "shield-check", en: "Secure Orders", bn: "নিরাপদ অর্ডার" },
  ],
  featuredCarousel: [
    { type: "service", en: "Express Printing", bn: "এক্সপ্রেস প্রিন্টিং" },
    { type: "product", en: "Fast-Charge Accessories", bn: "ফাস্ট-চার্জ এক্সেসরিজ" },
    { type: "service", en: "Legal Document Support", bn: "লিগ্যাল ডকুমেন্ট সাপোর্ট" },
    { type: "service", en: "Business AI Automation", bn: "বিজনেস AI অটোমেশন" },
  ],
  reviewHighlights: [
    {
      en: "\u201cGreat quality and fast support. Everything in one platform.\u201d",
      bn: "\u201c\u09a6\u09be\u09b0\u09c1\u09a3 \u09ae\u09be\u09a8 \u0993 \u09a6\u09cd\u09b0\u09c1\u09a4 \u09b8\u09be\u09aa\u09cb\u09b0\u09cd\u099f\u0964 \u098f\u0995 \u09aa\u09cd\u09b2\u09be\u099f\u09ab\u09b0\u09cd\u09ae\u09c7 \u09b8\u09ac \u09b8\u09ae\u09be\u09a7\u09be\u09a8\u0964\u201d",
      by: "Rahim Enterprise",
    },
    {
      en: "\u201cReliable services with clear communication and secure delivery.\u201d",
      bn: "\u201c\u09ac\u09bf\u09b6\u09cd\u09ac\u09be\u09b8\u09af\u09cb\u0997\u09cd\u09af \u09b8\u09c7\u09ac\u09be, \u09b8\u09cd\u09aa\u09b7\u09cd\u099f \u09af\u09cb\u0997\u09be\u09af\u09cb\u0997 \u0993 \u09a8\u09bf\u09b0\u09be\u09aa\u09a6 \u09a1\u09c7\u09b2\u09bf\u09ad\u09be\u09b0\u09bf\u0964\u201d",
      by: "Nusrat Traders",
    },
  ],
  welcomeEn: "Welcome!",
  welcomeBn: "\u09b8\u09cd\u09ac\u09be\u0997\u09a4\u09ae\u09cd!",
  subtitleEn: "All your business solutions in one platform.",
  subtitleBn: "\u0986\u09aa\u09a8\u09be\u09b0 \u09ac\u09cd\u09af\u09ac\u09b8\u09be\u09b0 \u09b8\u09ac \u09b8\u09ae\u09be\u09a7\u09be\u09a8 \u098f\u0995 \u09aa\u09cd\u09b2\u09be\u099f\u09ab\u09b0\u09cd\u09ae\u09c7\u0964",
  offerEn: "Free business consultation for new clients today.",
  offerBn: "\u09a8\u09a4\u09c1\u09a8 \u0995\u09cd\u09b2\u09be\u09df\u09c7\u09a8\u09cd\u099f\u09a6\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09ab\u09cd\u09b0\u09bf \u09ac\u09bf\u099c\u09a8\u09c7\u09b8 \u0995\u09a8\u09b8\u09be\u09b2\u09cd\u099f\u09c7\u09b6\u09a8\u0964",
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
