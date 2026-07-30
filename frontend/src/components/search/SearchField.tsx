"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/language";

/**
 * GAP-03 — canonical search field.
 *
 * `/search` previously rendered results for `?q=` with no input and no form,
 * so a customer who arrived with a misspelled query, or who wanted to narrow
 * one, had to return to the navbar. Search is inherently iterative; a results
 * page that cannot be searched from breaks the loop that makes search work.
 *
 * Submitting pushes a new history entry, so the back button walks the
 * customer's own query history instead of leaving search entirely.
 *
 * No autofocus: the visitor arrived to read results, and opening the keyboard
 * would hide half of them.
 */
export default function SearchField({
  initialQuery = "",
  className = "",
}: {
  initialQuery?: string;
  className?: string;
}) {
  const router = useRouter();
  const { lang } = useLanguageStore();
  const [value, setValue] = useState(initialQuery);

  // Keep in sync when the URL changes (back/forward, or a suggestion click).
  useEffect(() => setValue(initialQuery), [initialQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = value.trim();
    if (!next || next === initialQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <form onSubmit={submit} role="search" className={`relative ${className}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={lang === "bn" ? "পণ্য ও সেবা খুঁজুন…" : "Search products & services…"}
        aria-label={lang === "bn" ? "খুঁজুন" : "Search"}
        className="input pl-9 pr-9 text-sm py-2.5 w-full"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label={lang === "bn" ? "মুছুন" : "Clear"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-heading"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
