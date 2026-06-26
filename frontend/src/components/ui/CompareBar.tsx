"use client";

import Link from "next/link";
import { GitCompare, X } from "lucide-react";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";

export default function CompareBar() {
  const { items, remove, clear } = useCompareStore();
  const { lang } = useLanguageStore();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
      <div className="glass rounded-2xl p-3 shadow-glass-strong border border-brand-100 dark:border-white/10 flex items-center gap-3">
        <GitCompare className="w-5 h-5 text-brand-600 flex-shrink-0" />
        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {items.map((p) => (
            <span key={p.slug} className="text-xs bg-brand-50 dark:bg-white/10 px-2 py-1 rounded-lg whitespace-nowrap flex items-center gap-1">
              {lang === "bn" ? p.name_bn : p.name_en}
              <button type="button" onClick={() => remove(p.id ?? p.slug)} aria-label="Remove">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <Link href="/compare" className="btn btn-brand btn-sm flex-shrink-0">
          {lang === "bn" ? "তুলনা" : "Compare"}
        </Link>
        <button type="button" onClick={clear} className="text-gray-400 hover:text-red-500 p-1" aria-label="Clear">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
