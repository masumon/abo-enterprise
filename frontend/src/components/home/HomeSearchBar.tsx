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
      className="flex items-center gap-1 h-12 rounded-xl border border-[var(--line)] bg-white dark:bg-[var(--surface-card)] shadow-sm focus-within:border-brand-500 dark:focus-within:border-brand-400 transition-colors"
    >
      <Search className="w-4 h-4 ml-3.5 flex-shrink-0 text-[var(--ink-muted)]" strokeWidth={2} aria-hidden />
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
        className="flex items-center gap-1.5 h-full px-3.5 flex-shrink-0 text-xs font-semibold text-[var(--ink-muted)] hover:text-brand-600 dark:hover:text-brand-400 transition-colors touch-manipulation"
      >
        <SlidersHorizontal className="w-4 h-4" strokeWidth={2} aria-hidden />
        {lang === "bn" ? "ফিল্টার" : "Filter"}
      </Link>
    </form>
  );
}
