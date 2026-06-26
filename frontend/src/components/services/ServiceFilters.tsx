"use client";

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
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedCategory === category.id
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
