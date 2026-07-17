"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Search, Package, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { productsApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

interface Props {
  query: string;
  onSelect: () => void;
  className?: string;
  listboxId?: string;
}

export default function SearchSuggestions({ query, onSelect, className, listboxId }: Props) {
  const [items, setItems] = useState<{ slug: string; name_en: string; name_bn: string; price: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguageStore();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const searchListId = listboxId || "search-suggestions";
  const priceLocale = lang === "bn" ? "bn-BD" : "en-BD";

  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      productsApi.suggest(query.trim())
        .then((r) => setItems(r.data.data ?? []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (query.trim().length < 2) return null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={lang === "bn" ? "সার্চ সাজেশন" : "Search suggestions"}
      className={cn("absolute top-full left-0 right-0 mt-1 glass rounded-xl shadow-glass-strong border border-gray-100 dark:border-white/10 overflow-hidden z-50", className)}
    >
      {loading ? (
        <div className="p-4 flex justify-center" role="status" aria-live="polite"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
      ) : items.length === 0 ? (
        <p className="p-4 text-sm text-gray-500 text-center">
          {lang === "bn" ? "কোনো ফলাফল নেই" : "No suggestions"}
        </p>
      ) : (
        <ul id={searchListId} role="listbox" aria-label={lang === "bn" ? "প্রোডাক্ট সাজেশন" : "Product suggestions"}>
          {items.map((item) => (
            <li key={item.slug} role="presentation">
              <Link
                href={`/products/${item.slug}`}
                onClick={onSelect}
                role="option"
                aria-selected={false}
                tabIndex={-1}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-brand-50 dark:hover:bg-white/5 text-sm"
              >
                <Package className="w-4 h-4 text-brand-500" />
                <span className="flex-1">{lang === "bn" ? item.name_bn : item.name_en}</span>
                <span className="text-accent-600 font-medium">৳{item.price.toLocaleString(priceLocale)}</span>
              </Link>
            </li>
          ))}
          <li role="presentation">
            <button
              type="button"
              onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); onSelect(); }}
              role="option"
              aria-selected={false}
              className="w-full px-4 py-2.5 text-sm text-brand-600 font-medium hover:bg-brand-50 dark:hover:bg-white/5 flex items-center gap-2 border-t border-gray-100 dark:border-white/10"
            >
              <Search className="w-4 h-4" />
              {lang === "bn" ? `সব ফলাফল দেখুন "${query}"` : `See all results for "${query}"`}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
