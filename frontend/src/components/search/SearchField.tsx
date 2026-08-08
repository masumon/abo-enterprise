"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/language";
import VoiceSearchButton from "@/components/search/VoiceSearchButton";
import ImageSearchButton from "@/components/search/ImageSearchButton";

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

  useEffect(() => setValue(initialQuery), [initialQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = value.trim();
    if (!next || next === initialQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  // Voice / image (OCR) results fill the box and run the search immediately.
  const runWith = (text: string) => {
    const next = text.trim();
    if (!next) return;
    setValue(next);
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  const filled = value.trim().length > 0;

  return (
    <form onSubmit={submit} role="search" className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] text-sm pointer-events-none" aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={lang === "bn" ? "পণ্য ও সেবা খুঁজুন…" : "Search products & services…"}
        aria-label={lang === "bn" ? "খুঁজুন" : "Search"}
        className={`w-full min-h-[40px] pl-8 pr-20 text-xs rounded-lg border bg-white dark:bg-[var(--surface)] ${
          filled
            ? "border-brand-600 dark:border-brand-400"
            : "border-[var(--line)]"
        } text-[var(--ink)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-brand-600 dark:focus:border-brand-400`}
      />
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {filled ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label={lang === "bn" ? "মুছুন" : "Clear"}
            className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <>
            <ImageSearchButton lang={lang} onResult={runWith} />
            <VoiceSearchButton lang={lang} onResult={runWith} />
          </>
        )}
      </div>
    </form>
  );
}
