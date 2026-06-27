/** Centralized design tokens — synced with globals.css CSS variables */
export const tokens = {
  colors: {
    brand: "#1e5ba8",
    accent: "#e91e63",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    surface: "#fafbff",
    surfaceSecondary: "#f0f4ff",
    navy: "#0a1628",
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

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://aboenterprise.com";

export const SOCIAL_PROFILES = [
  "https://www.facebook.com/abo.enterprise",
  "https://www.linkedin.com/company/abo-enterprise",
  "https://www.instagram.com/abo.enterprise",
] as const;

export const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512.png`;

export const BRAND_TAGLINE = {
  en: "Bangladesh's Complete Technology Ecosystem",
  bn: "বাংলাদেশের সম্পূর্ণ টেকনোলজি ইকোসিস্টেম",
} as const;

export const ABO_ACRONYM = {
  en: "ABO — Ahmed Brothers Organization: Sylhet's trusted enterprise for products, services & software.",
  bn: "ABO — Ahmed Brothers Organization: পণ্য, সেবা ও সফটওয়্যারের বিশ্বস্ত এন্টারপ্রাইজ।",
} as const;
