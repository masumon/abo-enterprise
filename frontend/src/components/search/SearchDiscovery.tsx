"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search, ShoppingBag, Wrench, Layers, Truck, BookOpen, Headphones,
  Clock, TrendingUp, X, type LucideIcon,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getApiBaseUrl } from "@/lib/apiBase";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { searchApi } from "@/lib/api";
import { getRecentSearches, clearRecentSearches } from "@/lib/recentSearches";

interface CategoryNode {
  id?: string;
  slug: string;
  name_en?: string;
  name_bn?: string;
  applies_to?: string[];
}
interface Suggestion { key: string; label: string; href: string }
interface AdminLink { label_en?: string; label_bn?: string; href?: string }

const SERVICE_LINKS: { icon: LucideIcon; href: string; en: string; bn: string }[] = [
  { icon: ShoppingBag, href: "/products", en: "Shop", bn: "শপ" },
  { icon: Wrench, href: "/services", en: "Services", bn: "সেবা" },
  { icon: Layers, href: "/projects", en: "Solutions", bn: "সলিউশন" },
  { icon: Truck, href: "/track", en: "Track order", bn: "অর্ডার ট্র্যাক" },
  { icon: BookOpen, href: "/blog", en: "Blog", bn: "ব্লগ" },
  { icon: Headphones, href: "/contact", en: "Contact", bn: "যোগাযোগ" },
];

const termHref = (t: string) => `/search?q=${encodeURIComponent(t)}`;

/**
 * Empty-state content for the search page: recent searches (device-local),
 * popular searches (from analytics), curated suggestions (admin links, then
 * live categories), and quick links to the main sections — the layout
 * customers know from apps like bKash. Only shown when the query is blank; it
 * never blocks or changes the actual search results.
 */
export default function SearchDiscovery() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const { settings } = usePublicSettings(["search_suggestions_json"]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => { setRecent(getRecentSearches()); }, []);

  useEffect(() => {
    let active = true;
    fetch(`${getApiBaseUrl()}/api/v1/categories`, { signal: AbortSignal.timeout(15000) })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!active) return;
        const tops = (j.data ?? []) as CategoryNode[];
        setSuggestions(tops.slice(0, 6).map((c) => {
          const isService = Array.isArray(c.applies_to) && c.applies_to.includes("service") && !c.applies_to.includes("product");
          return {
            key: c.id ?? c.slug,
            label: (bn && c.name_bn ? c.name_bn : c.name_en) || c.slug,
            href: `${isService ? "/services" : "/products"}?category_slug=${c.slug}`,
          };
        }));
      })
      .catch(() => {});
    searchApi.popular()
      .then((r) => { if (active) setPopular((r.data.data ?? []).slice(0, 8)); })
      .catch(() => {});
    return () => { active = false; };
  }, [bn]);

  // Admin-curated links (settings JSON). Invalid/empty → nothing shown.
  let adminLinks: AdminLink[] = [];
  try {
    const raw = getSettingValue(settings, "search_suggestions_json");
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) adminLinks = p as AdminLink[]; }
  } catch { /* ignore malformed */ }

  const clearRecent = () => { clearRecentSearches(); setRecent([]); };

  return (
    <div className="pt-4 space-y-6">
      {/* Recent (device-local) */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">{bn ? "সাম্প্রতিক" : "Recent"}</p>
            <button type="button" onClick={clearRecent} className="text-[11px] font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)] inline-flex items-center gap-1">
              <X className="w-3 h-3" /> {bn ? "মুছুন" : "Clear"}
            </button>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {recent.map((t) => (
              <Link key={t} href={termHref(t)} className="flex items-center gap-3 py-3 min-h-[44px]">
                <span className="w-9 h-9 rounded-full border border-[var(--line)] flex-none flex items-center justify-center text-[var(--ink-muted)]"><Clock className="w-4 h-4" aria-hidden /></span>
                <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--ink)] truncate">{t}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Popular (analytics) */}
      {popular.length > 0 && (
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1">{bn ? "জনপ্রিয়" : "Popular"}</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((t) => (
              <Link key={t} href={termHref(t)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--line)] text-[13px] font-medium text-[var(--ink)] hover:border-brand-300">
                <TrendingUp className="w-3.5 h-3.5 text-brand-500" aria-hidden /> {t}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suggestions: admin links first, then live categories */}
      {(adminLinks.length > 0 || suggestions.length > 0) && (
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1">{bn ? "সাজেশন" : "Suggestions"}</p>
          <div className="divide-y divide-[var(--line)]">
            {adminLinks.filter((l) => l.href && (l.label_en || l.label_bn)).map((l, i) => (
              <Link key={`a${i}`} href={l.href!} className="flex items-center gap-3 py-3 min-h-[44px]">
                <span className="w-9 h-9 rounded-full border border-[var(--line)] flex-none flex items-center justify-center text-[var(--ink-muted)]"><Search className="w-4 h-4" aria-hidden /></span>
                <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--ink)] truncate">{(bn && l.label_bn ? l.label_bn : l.label_en) || l.label_bn}</span>
              </Link>
            ))}
            {suggestions.map((s) => (
              <Link key={s.key} href={s.href} className="flex items-center gap-3 py-3 min-h-[44px]">
                <span className="w-9 h-9 rounded-full border border-[var(--line)] flex-none flex items-center justify-center text-[var(--ink-muted)]"><Search className="w-4 h-4" aria-hidden /></span>
                <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--ink)] truncate">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Other services */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-1">{bn ? "অন্যান্য সেবাসমূহ" : "Other services"}</p>
        <div className="divide-y divide-[var(--line)]">
          {SERVICE_LINKS.map(({ icon: Icon, href, en, bn: labelBn }) => (
            <Link key={href} href={href} className="flex items-center gap-3 py-3 min-h-[44px]">
              <span className="w-9 h-9 rounded-full border border-[var(--line)] flex-none flex items-center justify-center text-brand-600 dark:text-brand-300"><Icon className="w-[18px] h-[18px]" aria-hidden /></span>
              <span className="flex-1 min-w-0 text-[14px] font-medium text-[var(--ink)] truncate">{bn ? labelBn : en}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
