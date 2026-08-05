"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useAnnouncements } from "@/hooks/useAnnouncements";

const STORAGE_KEY = "abo-announcement-dismissed";
const ANNOUNCEMENT_HEIGHT = "2.25rem";

function setAnnouncementHeight(visible: boolean) {
  document.documentElement.style.setProperty(
    "--announcement-height",
    visible ? ANNOUNCEMENT_HEIGHT : "0px"
  );
}

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const { lang } = useLanguageStore();
  // Desktop-only strip (mobile shows the in-header ticker instead, see
  // Navbar.tsx) — same shared data/suppression logic either way.
  const { announcements, shouldShow, durationSec } = useAnnouncements();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    const active = !dismissed && shouldShow;
    setVisible(active);
    setAnnouncementHeight(active);
  }, [shouldShow]);

  const dismiss = () => {
    setVisible(false);
    setAnnouncementHeight(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!visible || announcements.length === 0) return null;

  const barClass = ANNOUNCEMENT_VARIANT_BG[announcements[0].variant ?? "promo"] ?? ANNOUNCEMENT_VARIANT_BG.promo;
  const canDismiss = announcements.some((a) => a.dismissible !== false);
  // Track is the announcement list rendered twice back-to-back; animating
  // exactly -50% of that doubled track is a seamless infinite loop no
  // matter how much content is in it.
  const track = [...announcements, ...announcements];

  return (
    <div className={`${barClass} text-xs sm:text-sm relative z-40 h-9 overflow-hidden shadow-sm`}>
      <div className="h-9 flex items-center gap-3 pl-3.5 sm:pl-5">
        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-white/15">
          <Zap className="w-3 h-3 text-yellow-300" strokeWidth={2.4} aria-hidden />
        </span>

        {/* Reuses the same shared marquee primitive as Stats.tsx / Navbar.tsx's
            mobile ticker, instead of a bespoke local <style jsx> keyframe. */}
        <div className="marquee-viewport flex-1 min-w-0">
          <div
            className="marquee-track items-center motion-reduce:animate-none"
            style={{ ["--marquee-duration" as string]: `${durationSec}s` }}
          >
            {track.map((a, i) => (
              <Link
                key={i}
                href={a.href || "/"}
                aria-hidden={i >= announcements.length}
                tabIndex={i >= announcements.length ? -1 : 0}
                className="inline-flex items-center gap-2 font-semibold tracking-[0.01em] hover:text-white transition-colors pr-10"
              >
                {a.icon && <span aria-hidden>{a.icon}</span>}
                <span>{lang === "bn" ? a.bn : a.en}</span>
              </Link>
            ))}
          </div>
        </div>

        {canDismiss ? (
          <button
            type="button"
            onClick={dismiss}
            className="flex-shrink-0 w-9 h-9 -mr-1 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
            aria-label={lang === "bn" ? "ঘোষণা বন্ধ করুন" : "Close announcement"}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        ) : (
          <span className="flex-shrink-0 w-9 h-9" aria-hidden />
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
