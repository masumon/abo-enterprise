"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, ShoppingBag, Wrench, Layers, Truck, BookOpen, Headphones,
  type LucideIcon,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getApiBaseUrl } from "@/lib/apiBase";

interface CategoryNode {
  id?: string;
  slug: string;
  name_en?: string;
  name_bn?: string;
  applies_to?: string[];
}

interface Suggestion {
  key: string;
  label: string;
  href: string;
}

/** Quick links to the site's main destinations — the "other services" row. */
const SERVICE_LINKS: { icon: LucideIcon; href: string; en: string; bn: string }[] = [
  { icon: ShoppingBag, href: "/products", en: "Shop", bn: "শপ" },
  { icon: Wrench, href: "/services", en: "Services", bn: "সেবা" },
  { icon: Layers, href: "/projects", en: "Solutions", bn: "সলিউশন" },
  { icon: Truck, href: "/track", en: "Track order", bn: "অর্ডার ট্র্যাক" },
  { icon: BookOpen, href: "/blog", en: "Blog", bn: "ব্লগ" },
  { icon: Headphones, href: "/contact", en: "Contact", bn: "যোগাযোগ" },
];

/**
 * Empty-state content for the search page: tappable category "suggestions"
 * (from the live catalogue) plus quick links to the main sections — the
 * layout customers know from apps like bKash. Shown only when the query is
 * blank; it never blocks or changes the actual search results.
 */
export default function SearchDiscovery() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${getApiBaseUrl()}/api/v1/categories`, { signal: AbortSignal.timeout(15000) })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!active) return;
        const tops = (j.data ?? []) as CategoryNode[]; // top-level nodes
        const items: Suggestion[] = tops.slice(0, 6).map((c) => {
          const isService =
            Array.isArray(c.applies_to) &&
            c.applies_to.includes("service") &&
            !c.applies_to.includes("product");
          return {
            key: c.id ?? c.slug,
            label: (bn && c.name_bn ? c.name_bn : c.name_en) || c.slug,
            href: `${isService ? "/services" : "/products"}?category_slug=${c.slug}`,
          };
        });
        setSuggestions(items);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [bn]);

  return (
    <div className="pt-4 space-y-6">
      {suggestions.length > 0 && (
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1">
            {bn ? "সাজেশন" : "Suggestions"}
          </p>
          <div className="divide-y divide-[var(--line)]">
            {suggestions.map((s) => (
              <Link key={s.key} href={s.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                <span className="w-9 h-9 rounded-full border border-[var(--line)] flex-none flex items-center justify-center text-[var(--ink-muted)]">
                  <Search className="w-4 h-4" aria-hidden />
                </span>
                <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--ink)] truncate">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1">
          {bn ? "অন্যান্য সেবাসমূহ" : "Other services"}
        </p>
        <div className="divide-y divide-[var(--line)]">
          {SERVICE_LINKS.map(({ icon: Icon, href, en, bn: labelBn }) => (
            <Link key={href} href={href} className="flex items-center gap-3 py-3 min-h-[44px]">
              <span className="w-9 h-9 rounded-full border border-[var(--line)] flex-none flex items-center justify-center text-brand-600 dark:text-brand-300">
                <Icon className="w-[18px] h-[18px]" aria-hidden />
              </span>
              <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--ink)] truncate">{bn ? labelBn : en}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
