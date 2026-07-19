"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { SITE_ANNOUNCEMENTS_KEY, getAnnouncements, type CmsAnnouncement } from "@/lib/cmsContent";

const STORAGE_KEY = "abo-announcement-dismissed";
const ANNOUNCEMENT_HEIGHT = "2.25rem";

function setAnnouncementHeight(visible: boolean) {
  document.documentElement.style.setProperty(
    "--announcement-height",
    visible ? ANNOUNCEMENT_HEIGHT : "0px"
  );
}

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

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([SITE_ANNOUNCEMENTS_KEY]);
  const announcements = getAnnouncements(settings, FALLBACK_ANNOUNCEMENTS).filter((a) => a.active !== false);
  const pathname = usePathname();
  const suppressedPrefixes = ["/admin", "/cart", "/checkout", "/login", "/register", "/profile", "/track"];
  const isSuppressed = suppressedPrefixes.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`));
  // Promotional bar belongs only where the visitor is browsing, not
  // mid-purchase or mid-account-action.
  const shouldShow = !isSuppressed;

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    const active = !dismissed && shouldShow;
    setVisible(active);
    setAnnouncementHeight(active);
  }, [shouldShow]);

  useEffect(() => {
    if (!visible || announcements.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [visible, announcements.length]);

  const dismiss = () => {
    setVisible(false);
    setAnnouncementHeight(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!visible || announcements.length === 0) return null;

  const current = announcements[idx % announcements.length];
  const barClass = ANNOUNCEMENT_VARIANT_BG[current.variant ?? "promo"] ?? ANNOUNCEMENT_VARIANT_BG.promo;
  const canDismiss = current.dismissible !== false;

  return (
    <div className={`${barClass} text-xs sm:text-sm relative z-40 h-9`}>
      <div className="container mx-auto px-4 h-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {announcements.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={lang === "bn" ? `ঘোষণা ${i + 1}` : `Announcement ${i + 1}`}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === idx ? "bg-white scale-125" : "bg-white/40"
              }`}
            />
          ))}
        </div>

        <Link
          href={current.href || "/"}
          className="flex-1 text-center font-medium hover:text-white/90 transition-colors flex items-center justify-center gap-2"
        >
          {current.icon ? (
            <span className="flex-shrink-0 text-sm leading-none" aria-hidden>{current.icon}</span>
          ) : (
            <Zap className="w-3.5 h-3.5 flex-shrink-0 text-yellow-300" strokeWidth={2.2} />
          )}
          <span className="truncate">
            {lang === "bn" ? current.bn : current.en}
          </span>
        </Link>

        {canDismiss ? (
          <button
            type="button"
            onClick={dismiss}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
            aria-label={lang === "bn" ? "ঘোষণা বন্ধ করুন" : "Close announcement"}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        ) : (
          <span className="flex-shrink-0 w-6 h-6" aria-hidden />
        )}
      </div>
    </div>
  );
}

/** Admin-selectable bar themes → gradient classes. */
const ANNOUNCEMENT_VARIANT_BG: Record<string, string> = {
  promo: "bg-gradient-to-r from-brand-700 via-brand-600 to-accent-600 text-white",
  offer: "bg-gradient-to-r from-accent-600 via-pink-600 to-rose-600 text-white",
  info: "bg-gradient-to-r from-sky-700 to-blue-600 text-white",
  success: "bg-gradient-to-r from-emerald-700 to-green-600 text-white",
  notice: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
  urgent: "bg-gradient-to-r from-red-700 to-rose-600 text-white",
};
