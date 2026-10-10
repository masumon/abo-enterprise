"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, Megaphone, GalleryHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

/**
 * "হোমপেজ সাজান" is the one place to arrange the homepage (in the order a
 * visitor sees it). The announcement bar and promo slides keep their own
 * pages (different data: a JSON list vs a DB slide table) — this tab bar
 * ties the three together so they read as one feature.
 */
const PAGES = [
  { href: "/sumon/homepage", icon: LayoutTemplate, label: "Arrange homepage", labelBn: "হোমপেজ সাজান" },
  { href: "/sumon/announcements", icon: Megaphone, label: "Announcement bar", labelBn: "ঘোষণা বার" },
  { href: "/sumon/promo-slides", icon: GalleryHorizontal, label: "Promo slides", labelBn: "প্রোমো স্লাইড" },
];

export default function HomepageSectionNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const bn = lang === "bn";

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {bn ? "হোমপেজ — এই তিনটি পাতা মিলে পুরো হোমপেজ" : "Homepage — these three pages make up the full homepage"}
      </p>
      <nav
        aria-label={bn ? "হোমপেজ অংশ" : "Homepage sections"}
        role="tablist"
        className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-full sm:w-fit flex-wrap"
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
