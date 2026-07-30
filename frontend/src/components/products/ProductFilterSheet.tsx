"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Subcategory } from "@/types";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

/**
 * Screen 06 — category, depth and sort live in a bottom sheet so the listing
 * keeps one control row instead of four. Four rows took roughly a third of a
 * 390px viewport, which left two and a half product cards visible on a
 * catalogue of a few hundred.
 *
 * The sheet owns no state. Every choice is handed straight back to the page,
 * which still holds category, subcategory and sort exactly as before — this is
 * a different place to stand, not a different mechanism.
 */
export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  chips: { value: string; label: { en: string; bn: string } }[];
  category: string;
  onCategoryChange: (value: string) => void;
  chipRows: { key: string; items: Subcategory[]; active: string; allValue: string }[];
  onSubcategoryChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  resultCount: number;
}

export default function ProductFilterSheet({
  open, onClose, chips, category, onCategoryChange,
  chipRows, onSubcategoryChange, sortBy, onSortChange, resultCount,
}: FilterSheetProps) {
  const { lang } = useLanguageStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  const bn = lang === "bn";

  const SORTS = [
    { value: "", label: { en: "Recommended", bn: "প্রস্তাবিত" } },
    { value: "price_asc", label: { en: "Price: Low → High", bn: "দাম: কম → বেশি" } },
    { value: "price_desc", label: { en: "Price: High → Low", bn: "দাম: বেশি → কম" } },
    { value: "newest", label: { en: "Newest first", bn: "নতুন আগে" } },
  ];

  const pill = (active: boolean) =>
    cn(
      "px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap min-h-[36px] border",
      active
        ? "bg-brand-600 text-white border-brand-600"
        : "bg-white dark:bg-white/5 text-brand-700 dark:text-brand-200 border-gray-200 dark:border-white/10"
    );

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-[#14182b]/45"
        onClick={onClose}
        aria-label={bn ? "বন্ধ করুন" : "Close"}
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-[var(--surface-card)] motion-safe:animate-slide-up"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className="sticky top-0 flex items-center gap-2 px-4 py-3 bg-white dark:bg-[var(--surface-card)] border-b border-gray-100 dark:border-white/10">
          <p className="flex-1 font-bold text-heading">{bn ? "ফিল্টার" : "Filters"}</p>
          <button type="button" onClick={onClose} className="p-2 -mr-2 text-muted" aria-label={bn ? "বন্ধ" : "Close"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="px-4 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-2">
            {bn ? "ক্যাটাগরি" : "Category"}
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button key={c.value} type="button" onClick={() => onCategoryChange(c.value)} className={pill(category === c.value)}>
                {bn ? c.label.bn : c.label.en}
              </button>
            ))}
          </div>
        </section>

        {/* One row per depth level along the selected path, unchanged — the
            taxonomy can nest as deep as the admin builds it. */}
        {chipRows.map((row) => (
          <section key={row.key} className="px-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onSubcategoryChange(row.allValue)} className={pill(!row.active)}>
                {bn ? "সব" : "All"}
              </button>
              {row.items.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => onSubcategoryChange(item.slug)}
                  className={pill(row.active === item.slug)}
                >
                  {bn && item.name_bn ? item.name_bn : item.name_en}
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="px-4 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-2">
            {bn ? "সাজান" : "Sort"}
          </p>
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <button key={s.value} type="button" onClick={() => onSortChange(s.value)} className={pill(sortBy === s.value)}>
                {bn ? s.label.bn : s.label.en}
              </button>
            ))}
          </div>
        </section>

        <div className="px-4 pt-5">
          <button type="button" onClick={onClose} className="btn btn-primary btn-md w-full">
            {bn ? `${resultCount}টি পণ্য দেখুন` : `Show ${resultCount} products`}
          </button>
        </div>
      </div>
    </div>
  );
}
