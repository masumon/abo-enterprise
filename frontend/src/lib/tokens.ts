/** Centralized design tokens — synced with globals.css CSS variables */
export const tokens = {
  colors: {
    brand: "#1e2b6b",
    accent: "#e4a11b",
    success: "#2e7d4f",
    warning: "#b8860b",
    error: "#b3341f",
    surface: "#f1f2f7",
    surfaceSecondary: "#e9ebf3",
    navy: "#14182b",
  },
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    full: "9999px",
  },
  spacing: {
    navbarOffset: "6.25rem",
    announcementHeight: "2.25rem",
    safeBottom: "env(safe-area-inset-bottom, 0px)",
  },
  shadow: {
    card: "0 4px 24px rgba(30,91,168,0.06), 0 1px 4px rgba(0,0,0,0.04)",
    glass: "0 8px 32px rgba(30,91,168,0.08), 0 2px 8px rgba(0,0,0,0.04)",
  },
  button: {
    sm: { px: "0.875rem", py: "0.375rem", text: "0.875rem" },
    md: { px: "1.25rem", py: "0.625rem", text: "0.875rem" },
    lg: { px: "1.75rem", py: "0.875rem", text: "1rem" },
  },
} as const;

// The apex domain 308-redirects to www, so canonical/sitemap/OG URLs must use the final
// www address (an apex value in the Vercel env made Google see "page with redirect").
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aboenterprise.com")
  .replace(/\/+$/, "")
  .replace(/^https?:\/\/aboenterprise\.com$/, "https://www.aboenterprise.com");

export const SOCIAL_PROFILES = [
  "https://www.facebook.com/abo.enterprise",
  "https://www.linkedin.com/company/abo-enterprise",
  "https://www.instagram.com/abo.enterprise",
] as const;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512.png`;

export const BRAND_NAME = {
  en: "ABO ENTERPRISE",
  bn: "এবিও এন্টারপ্রাইজ",
} as const;

export const BRAND_TAGLINE = {
  en: "Simple Solution",
  bn: "সহজ সমাধান",
} as const;

export type BrandLang = keyof typeof BRAND_NAME;

export function getBrandName(lang: BrandLang): string {
  return BRAND_NAME[lang];
}

export function getBrandTagline(lang: BrandLang): string {
  return BRAND_TAGLINE[lang];
}

export function getBrandFullTitle(lang: BrandLang): string {
  return `${BRAND_NAME[lang]} : ${BRAND_TAGLINE[lang]}`;
}

export const BRAND_MOTTO = BRAND_TAGLINE;

export const ABO_ACRONYM = {
  en: "ABO — Sumon Brothers Organization: Trusted enterprise for products, services & software.",
  bn: "ABO — Sumon Brothers Organization: পণ্য, সেবা ও সফটওয়্যারের বিশ্বস্ত এন্টারপ্রাইজ।",
} as const;

/** Copyright range shown in footers: first year of the business to the current year (e.g. "2023–2026"). */
export const COPYRIGHT_START_YEAR = 2023;
export const copyrightYears = (): string => `${COPYRIGHT_START_YEAR}–${new Date().getFullYear()}`;
