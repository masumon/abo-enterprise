"use client";

import { useState, useEffect } from "react";
import { useLanguageStore } from "@/store/language";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CATEGORY_FILTERS = [
  { id: "all", label: { en: "All", bn: "সব" } },
  { id: "mobile", label: { en: "Mobile", bn: "মোবাইল" } },
  { id: "laptop", label: { en: "Laptop", bn: "ল্যাপটপ" } },
  { id: "audio", label: { en: "Audio", bn: "অডিও" } },
  { id: "watch", label: { en: "Smart Watch", bn: "স্মার্ট ওয়াচ" } },
  { id: "camera", label: { en: "Camera", bn: "ক্যামেরা" } },
  { id: "charger", label: { en: "Charger", bn: "চার্জার" } },
];

interface ProductCategoryTabsProps {
  activeCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
}

export default function ProductCategoryTabs({
  activeCategory = "all",
  onCategoryChange,
}: ProductCategoryTabsProps) {
  const { lang } = useLanguageStore();
  const [active, setActive] = useState(activeCategory);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleCategoryChange = (categoryId: string) => {
    setActive(categoryId);
    onCategoryChange?.(categoryId);
  };

  const scrollTabs = (direction: "left" | "right") => {
    const container = document.getElementById("category-tabs-container");
    if (container) {
      const scrollAmount = 100;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    const container = document.getElementById("category-tabs-container");
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      );
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, []);

  return (
    <div className="relative py-4 sm:py-6 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-2 sm:px-4">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollTabs("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-white dark:bg-[var(--surface)] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors md:hidden"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Category Tabs */}
        <div
          id="category-tabs-container"
          className="flex gap-2 overflow-x-auto scrollbar-hide px-8 sm:px-0 md:px-0"
          onScroll={handleScroll}
        >
          {CATEGORY_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleCategoryChange(id)}
              className={`px-4 py-2.5 rounded-full whitespace-nowrap font-semibold text-sm transition-all flex-shrink-0 ${
                active === id
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"
              }`}
            >
              {lang === "bn" ? label.bn : label.en}
            </button>
          ))}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={() => scrollTabs("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-white dark:bg-[var(--surface)] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors md:hidden"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
