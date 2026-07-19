"use client";

import { cn } from "@/lib/utils";

interface Category {
  id: string | null;
  label: string;
  en: string;
}

interface ServiceFiltersProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function ServiceFilters({
  categories,
  selectedCategory,
  onCategoryChange,
}: ServiceFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter services by category">
      {categories.map((category) => (
        <button
          key={category.id ?? "all"}
          type="button"
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200",
            selectedCategory === category.id
              ? "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-md shadow-brand-900/20 ring-1 ring-brand-500/40"
              : "bg-gradient-to-b from-white to-brand-50/70 dark:from-white/[0.06] dark:to-brand-900/20 text-brand-700 dark:text-brand-200 ring-1 ring-brand-100 dark:ring-brand-800/70 shadow-sm shadow-brand-900/[0.04] hover:-translate-y-0.5 hover:ring-brand-300 dark:hover:ring-brand-600 hover:shadow-md"
          )}
          aria-pressed={selectedCategory === category.id}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
