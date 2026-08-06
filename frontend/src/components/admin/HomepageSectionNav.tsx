"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutTemplate, Megaphone, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

/**
 * Homepage content is split across three pages backed by different data
 * (JSON settings vs a DB-backed slide table), so they can't be merged into
 * one form without a data-model rewrite. This strip keeps them discoverable
 * as one feature by cross-linking each page to the other two.
 */
const PAGES = [
  { href: "/admin/homepage", icon: LayoutTemplate, label: "Homepage Content", labelBn: "হোমপেজ কনটেন্ট" },
  { href: "/admin/promo-slides", icon: Images, label: "Banners & Slider", labelBn: "ব্যানার ও স্লাইড" },
  { href: "/admin/announcements", icon: Megaphone, label: "Announcement Bar", labelBn: "ঘোষণা বার" },
];

export default function HomepageSectionNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const bn = lang === "bn";

  return (
    <nav aria-label={bn ? "হোমপেজ অংশ" : "Homepage sections"} className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs font-semibold text-muted uppercase tracking-wide">{bn ? "হোমপেজ:" : "Homepage:"}</span>
      {PAGES.map((p) => {
        const active = pathname.startsWith(p.href);
        const Icon = p.icon;
        return (
          <Link
            key={p.href}
            href={p.href}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
              active
                ? "bg-brand-600 text-white border-transparent"
                : "bg-white dark:bg-white/5 text-muted border-gray-200 dark:border-white/10 hover:border-brand-300 hover:text-brand-700"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {bn ? p.labelBn : p.label}
          </Link>
        );
      })}
    </nav>
  );
}
