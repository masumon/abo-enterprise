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
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            selectedCategory === category.id
              ? "bg-brand-600 text-white shadow-md"
              : "enterprise-card text-muted hover:text-heading"
          )}
          aria-pressed={selectedCategory === category.id}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
