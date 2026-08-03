"use client";

import { usePathname } from "next/navigation";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_ANNOUNCEMENTS_KEY, getAnnouncements, type CmsAnnouncement } from "@/lib/cmsContent";

// Default messages — used only until the admin sets site_announcements_json.
const FALLBACK_ANNOUNCEMENTS: CmsAnnouncement[] = [
  {
    en: "🎉 New AI Solutions available! Get 20% off on first consultation →",
    bn: "🎉 নতুন AI সমাধান এসেছে! প্রথম পরামর্শে ২০% ছাড় পান →",
    href: "/services",
  },
  {
    en: "📦 Free delivery on orders over ৳2000 in Sylhet",
    bn: "📦 সিলেটে ৳২০০০+ অর্ডারে ফ্রি ডেলিভারি",
    href: "/products",
  },
  {
    en: "💼 Custom POS & ERP Software for your business — Book a free demo",
    bn: "💼 আপনার ব্যবসার জন্য কাস্টম POS ও ERP — ফ্রি ডেমো বুক করুন",
    href: "/projects",
  },
];

const SUPPRESSED_PREFIXES = ["/admin", "/cart", "/checkout", "/login", "/register", "/profile", "/track"];

/** Shared data layer for the announcement bar (desktop strip) and the
 * mobile in-header ticker — same settings key, fallback and per-route
 * suppression, so the two surfaces can never drift out of sync. */
export function useAnnouncements() {
  const { settings } = usePublicSettings([SITE_ANNOUNCEMENTS_KEY]);
  const announcements = getAnnouncements(settings, FALLBACK_ANNOUNCEMENTS).filter((a) => a.active !== false);
  const pathname = usePathname();
  const isSuppressed = SUPPRESSED_PREFIXES.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`));
  const shouldShow = !isSuppressed && announcements.length > 0;
  // Ticker duration scales with content so speed reads the same whether
  // there's 1 announcement or 5 — not a fixed, content-length-blind timer.
  const durationSec = Math.max(12, announcements.length * 9);
  return { announcements, shouldShow, durationSec };
}
