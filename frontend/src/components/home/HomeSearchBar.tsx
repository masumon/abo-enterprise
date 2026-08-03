"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useLanguageStore } from "@/store/language";

/**
 * Homepage-only search entry point. Deliberately not SearchField reused
 * in place - that component is wired to the /search page's own state, and
 * this needs a distinct "Filter" affordance next to it that SearchField
 * doesn't have. Submits to the same /search?q= route SearchField uses.
 */
export default function HomeSearchBar() {
  const router = useRouter();
  const { lang } = useLanguageStore();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = value.trim();
    if (next) router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className="flex items-center gap-1 h-[52px] rounded-full border border-[var(--line)] bg-white dark:bg-[var(--surface-card)] shadow-[0_2px_10px_rgba(20,24,43,0.06)] focus-within:border-brand-500 focus-within:shadow-[0_4px_16px_rgba(59,102,241,0.15)] dark:focus-within:border-brand-400 transition-all"
    >
      <Search className="w-4 h-4 ml-4 flex-shrink-0 text-[var(--ink-muted)]" strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={lang === "bn" ? "কি খুঁজছেন?" : "What are you looking for?"}
        aria-label={lang === "bn" ? "খুঁজুন" : "Search"}
        className="flex-1 min-w-0 h-full px-2.5 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none"
      />
      <span className="w-px h-6 bg-[var(--line)] flex-shrink-0" aria-hidden />
      <Link
        href="/products"
        className="flex items-center gap-1.5 h-[calc(100%-8px)] my-1 mr-1 px-4 flex-shrink-0 rounded-full text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors touch-manipulation"
      >
        <SlidersHorizontal className="w-4 h-4" strokeWidth={2} aria-hidden />
        {lang === "bn" ? "ফিল্টার" : "Filter"}
      </Link>
    </form>
  );
}
