"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, Megaphone, GalleryHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

/**
 * Homepage content is split across three pages backed by different data
 * (JSON settings vs a DB-backed slide table), so they can't be merged into
 * one form without a data-model rewrite. Styled as a tab bar (not just a
 * link strip) so the three pages read as one "Homepage" feature with three
 * tabs, even though each is its own route/page underneath.
 */
const PAGES = [
  { href: "/sumon/homepage", icon: LayoutTemplate, label: "Content", labelBn: "কনটেন্ট" },
  { href: "/sumon/promo-slides", icon: GalleryHorizontal, label: "Banners & Slider", labelBn: "ব্যানার ও স্লাইড" },
  { href: "/sumon/announcements", icon: Megaphone, label: "Announcement Bar", labelBn: "ঘোষণা বার" },
];

export default function HomepageSectionNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const bn = lang === "bn";

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {bn ? "হোমপেজ — এই তিনটি একসাথে পুরো হোমপেজ তৈরি করে" : "Homepage — these three together make up the full homepage"}
      </p>
      <nav
        aria-label={bn ? "হোমপেজ অংশ" : "Homepage sections"}
        role="tablist"
        className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit flex-wrap"
      >
        {PAGES.map((p) => {
          const active = pathname.startsWith(p.href);
          const Icon = p.icon;
          return (
            <Link
              key={p.href}
              href={p.href}
              role="tab"
              aria-selected={active}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white dark:bg-gray-800 text-brand-700 dark:text-brand-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {bn ? p.labelBn : p.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
