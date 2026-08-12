"use client";

import { useState, useEffect } from "react";
import { useLanguageStore } from "@/store/language";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Must match the product `category` values used in Admin → Products
// (frontend/src/app/sumon/products/page.tsx CATEGORIES) — these previously
// listed device types (Mobile/Laptop/Audio...) that no product's `category`
// field ever contained, so every tab except "All" silently showed nothing.
const CATEGORY_FILTERS = [
  { id: "all", label: { en: "All", bn: "সব" } },
  { id: "gadgets", label: { en: "Premium Gadgets", bn: "প্রিমিয়াম গ্যাজেট" } },
  { id: "accessories", label: { en: "Mobile Accessories", bn: "মোবাইল এক্সেসরিজ" } },
  { id: "electronics", label: { en: "Electronics", bn: "ইলেকট্রনিক্স" } },
  { id: "computer", label: { en: "Computer", bn: "কম্পিউটার" } },
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

  useEffect(() => {
    setActive(activeCategory);
  }, [activeCategory]);

  const handleCategoryChange = (categoryId: string) => {
    setActive(categoryId);
    onCategoryChange?.(categoryId);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % CATEGORY_FILTERS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + CATEGORY_FILTERS.length) % CATEGORY_FILTERS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = CATEGORY_FILTERS.length - 1;
    else return;

    event.preventDefault();
    const nextId = CATEGORY_FILTERS[nextIndex].id;
    handleCategoryChange(nextId);
    requestAnimationFrame(() => {
      document.getElementById(`category-tab-${nextId}`)?.focus();
    });
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
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-white dark:bg-[var(--surface)] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors md:hidden"
            aria-label={lang === "bn" ? "বামে স্ক্রল করুন" : "Scroll left"}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <div
          id="category-tabs-container"
          role="tablist"
          aria-label={lang === "bn" ? "পণ্য ক্যাটেগরি" : "Product categories"}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-8 sm:px-0 md:px-0"
          onScroll={handleScroll}
        >
          {CATEGORY_FILTERS.map(({ id, label }, index) => (
            <button
              key={id}
              id={`category-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active === id}
              aria-controls="featured-products"
              tabIndex={active === id ? 0 : -1}
              onClick={() => handleCategoryChange(id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
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

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-lg bg-white dark:bg-[var(--surface)] border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors md:hidden"
            aria-label={lang === "bn" ? "ডানে স্ক্রল করুন" : "Scroll right"}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
