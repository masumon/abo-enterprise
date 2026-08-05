"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Loader2, LayoutGrid, List, X } from "lucide-react";
import type { Category, Product, Subcategory } from "@/types";
import ProductCard from "@/components/features/ProductCard";
import Reveal from "@/components/ui/Reveal";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import LoadingProgress from "@/components/ui/LoadingProgress";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";
import ProductFilterSheet from "@/components/products/ProductFilterSheet";
import EmptyState from "@/components/ui/EmptyState";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import DemoModeBanner from "@/components/ui/DemoModeBanner";
import type { CatalogSource } from "@/lib/catalogLoader";
import { loadProducts, peekCachedProducts } from "@/lib/catalogLoader";
import { cacheApiResponse, productsCacheKey } from "@/lib/apiCache";

// Legacy hardcoded chips — fallback when the DB taxonomy is empty/unreachable.
const CATEGORIES: { value: string; label: { en: string; bn: string } }[] = [
  { value: "", label: { en: "All", bn: "সব" } },
  { value: "accessories", label: { en: "Mobile Accessories", bn: "মোবাইল এক্সেসরিজ" } },
  { value: "gadgets", label: { en: "Premium Gadgets", bn: "প্রিমিয়াম গ্যাজেট" } },
  { value: "electronics", label: { en: "Electronics", bn: "ইলেকট্রনিক্স" } },
  { value: "computer", label: { en: "Computer Accessories", bn: "কম্পিউটার এক্সেসরিজ" } },
];

interface Props {
  initialProducts: Product[];
  initialTotal: number;
  initialPage?: number;
  initialCategory?: string;
  initialIsDemo?: boolean;
  /** Live product taxonomy — chip values are category slugs when present. */
  initialCategories?: Category[];
}

export default function ProductsClient({
  initialProducts,
  initialTotal,
  initialPage = 1,
  initialCategory = "",
  initialIsDemo = false,
  initialCategories = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguageStore();
  const t = useT();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<string>(initialCategory);
  const [subcategory, setSubcategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [catalogSource, setCatalogSource] = useState<CatalogSource>("api");
  const { openCart } = useCartStore();
  const infiniteScroll = useFeatureFlag("feature_infinite_scroll");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const needsApiRefresh = useRef(initialProducts.length === 0);
  const urlCategory = searchParams.get("category") ?? "";
  const urlSubcategory = searchParams.get("sub") ?? "";

  // Chips come from the live taxonomy when available; legacy list otherwise.
  const taxonomyMode = initialCategories.length > 0;
  const chips: { value: string; label: { en: string; bn: string } }[] = taxonomyMode
    ? [
        { value: "", label: { en: "All", bn: "সব" } },
        ...initialCategories.map((c) => ({
          value: c.slug,
          label: { en: c.name_en, bn: c.name_bn || c.name_en },
        })),
      ]
    : CATEGORIES;
  const selectedTaxonomyCategory = taxonomyMode
    ? initialCategories.find((c) => c.slug === category)
    : undefined;

  // Cascading chip rows — one row per depth level along the selected path
  // (unlimited-depth taxonomy). `subcategory` holds the deepest selected slug.
  const findPath = (node: Subcategory, slug: string): Subcategory[] | null => {
    for (const child of node.subcategories ?? []) {
      if (child.is_active === false) continue;
      if (child.slug === slug) return [child];
      const deeper = findPath(child, slug);
      if (deeper) return [child, ...deeper];
    }
    return null;
  };
  const rootNode = selectedTaxonomyCategory as unknown as Subcategory | undefined;
  const selectedPath = rootNode && subcategory ? findPath(rootNode, subcategory) ?? [] : [];
  const chipRows: { key: string; items: Subcategory[]; active: string; allValue: string }[] = [];
  {
    let parent = rootNode;
    let idx = 0;
    while (parent) {
      const items = (parent.subcategories ?? []).filter((s) => s.is_active !== false);
      if (items.length === 0) break;
      const active = selectedPath[idx]?.slug ?? "";
      chipRows.push({
        key: parent.slug,
        items,
        active,
        // "All" at this row keeps the selection one level up.
        allValue: idx === 0 ? "" : selectedPath[idx - 1].slug,
      });
      if (!active) break;
      parent = selectedPath[idx];
      idx++;
    }
  }

  useEffect(() => {
    if (initialProducts.length > 0) {
      const key = productsCacheKey({
        category: initialCategory || undefined,
        page: initialPage,
      });
      cacheApiResponse(key, { products: initialProducts, total: initialTotal }).catch(() => {});
    }
  }, [initialProducts, initialTotal, initialCategory, initialPage]);

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
    setCategory(initialCategory);
    setCatalogSource("api");
    isFirstLoad.current = true;
    needsApiRefresh.current = initialProducts.length === 0;
  }, [initialProducts, initialTotal, initialCategory]);

  useEffect(() => {
    const next = urlCategory && chips.some((c) => c.value === urlCategory) ? urlCategory : "";
    setCategory((prev) => (prev === next ? prev : next));
    const nextSub = next && urlSubcategory ? urlSubcategory : "";
    setSubcategory((prev) => (prev === nextSub ? prev : nextSub));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory, urlSubcategory]);

  const syncUrl = (cat: string, sub: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cat) params.set("category", cat);
    else params.delete("category");
    if (sub) params.set("sub", sub);
    else params.delete("sub");
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setSubcategory("");
    syncUrl(value, "");
  };

  const handleSubcategoryChange = (value: string) => {
    setSubcategory(value);
    syncUrl(category, value);
  };

  /**
   * What the visitor has actually narrowed by, as removable chips. Derived
   * rather than tracked: the page already holds category, subcategory, sort and
   * search, and a second copy of that truth would be one more thing to keep in
   * step.
   */
  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (category) {
    const chip = chips.find((c) => c.value === category);
    activeFilters.push({
      key: "category",
      label: chip ? (lang === "bn" ? chip.label.bn : chip.label.en) : category,
      clear: () => handleCategoryChange(""),
    });
  }
  if (subcategory) {
    const node = selectedPath[selectedPath.length - 1];
    activeFilters.push({
      key: "sub",
      label: node ? (lang === "bn" && node.name_bn ? node.name_bn : node.name_en) : subcategory,
      // Clearing a depth step returns to its parent, not to the top.
      clear: () => handleSubcategoryChange(selectedPath.length > 1 ? selectedPath[selectedPath.length - 2].slug : ""),
    });
  }
  if (sortBy) {
    const SORT_LABELS: Record<string, { en: string; bn: string }> = {
      price_asc: { en: "Price: Low → High", bn: "দাম: কম → বেশি" },
      price_desc: { en: "Price: High → Low", bn: "দাম: বেশি → কম" },
      newest: { en: "Newest first", bn: "নতুন আগে" },
    };
    const l = SORT_LABELS[sortBy];
    if (l) activeFilters.push({ key: "sort", label: lang === "bn" ? l.bn : l.en, clear: () => setSortBy("") });
  }
  if (search) {
    activeFilters.push({ key: "search", label: `"${search}"`, clear: () => setSearch("") });
  }

  const clearAllFilters = () => {
    setSearch("");
    setSortBy("");
    setCategory("");
    setSubcategory("");
    syncUrl("", "");
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(false);

    // Taxonomy chips filter by slug; legacy chips keep the old string filter.
    const isTaxonomy = taxonomyMode && !!category;
    const params = {
      category: !isTaxonomy ? category || undefined : undefined,
      category_slug: isTaxonomy ? category : undefined,
      subcategory_slug: isTaxonomy && subcategory ? subcategory : undefined,
      search: debouncedSearch || undefined,
      sort_by: sortBy || undefined,
      page: pageNum,
    };

    if (!append && pageNum === 1) {
      const cached = await peekCachedProducts(params);
      if (cached) {
        setProducts(cached.products);
        setTotal(cached.total);
        setCatalogSource(cached.source);
        setLoading(false);
      }
    }

    try {
      const result = await loadProducts(params);
      setProducts((prev) => (append ? [...prev, ...result.products] : result.products));
      setTotal(result.total);
      setCatalogSource(result.source);
      setPage(pageNum);
    } catch {
      const cached = await peekCachedProducts(params);
      if (cached) {
        setProducts(cached.products);
        setTotal(cached.total);
        setCatalogSource(cached.source);
        setError(false);
      } else {
        setError(true);
        setCatalogSource("api");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, subcategory, taxonomyMode, debouncedSearch, sortBy]);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      if (needsApiRefresh.current) load(1, false);
      return;
    }
    load(1, false);
  }, [load]);

  useEffect(() => {
    if (!infiniteScroll) return;
    const el = sentinelRef.current;
    if (!el || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && products.length < total && !loadingMore) {
          load(page + 1, true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load, page, products.length, total, loading, loadingMore, infiniteScroll]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <LoadingProgress loading={loading} message={t("loading_products")} className="mb-6" />
      <DemoModeBanner show={catalogSource === "cache" && !loading} source={catalogSource} />

      {/*
        Screen 06 — one control row. Search plus a single Filter button that
        carries a marigold count, with the applied filters shown as removable
        chips beneath it. There used to be four rows (search, category,
        sub-category, sort/view) taking roughly a third of a 390px viewport, so
        a catalogue of a few hundred products opened on two and a half cards.
        Category, depth and sort moved into a bottom sheet; no state, handler or
        URL parameter changed.
      */}
      <div className="sticky top-[var(--navbar-offset)] z-30 -mx-4 px-4 py-3 mb-3 bg-white/95 dark:bg-[var(--surface-card)]/95 backdrop-blur-sm border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="product-search" className="sr-only">
              {lang === "bn" ? "পণ্য খুঁজুন" : "Search products"}
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "bn" ? "পণ্য খুঁজুন..." : "Search products..."}
              className="input pl-10 w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen}
            aria-haspopup="dialog"
            className="relative flex-shrink-0 min-h-[44px] px-3.5 rounded-xl border border-gray-200 dark:border-white/10 flex items-center gap-2 text-sm font-semibold text-heading"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden />
            <span className="hidden sm:inline">{lang === "bn" ? "ফিল্টার" : "Filters"}</span>
            {activeFilters.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-[#14182b] text-[10px] font-bold flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>
          {/* GAP-21 — below md a list row and a two-up card carry nearly the
              same information, so the toggle returns only at tablet width. */}
          <div className="hidden md:flex rounded-xl border border-gray-200 overflow-hidden flex-shrink-0" role="group" aria-label={lang === "bn" ? "ভিউ মোড" : "View mode"}>
            <button type="button" onClick={() => setViewMode("grid")} className={cn("p-2.5", viewMode === "grid" ? "bg-brand-600 text-white" : "bg-white text-gray-500")} aria-label={t("grid_view")} aria-pressed={viewMode === "grid"}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setViewMode("list")} className={cn("p-2.5", viewMode === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-500")} aria-label={t("list_view")} aria-pressed={viewMode === "list"}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Applied-filter rail: what is on, how many results it left, and one
            way to clear all of it. */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mt-2.5">
            <span className="text-xs text-muted whitespace-nowrap flex-shrink-0">
              {total} {lang === "bn" ? "পণ্য" : "products"}
            </span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                className="flex-shrink-0 inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200 border border-brand-100 dark:border-brand-800"
              >
                {f.label}
                <X className="w-3 h-3" aria-hidden />
                <span className="sr-only">{lang === "bn" ? "সরান" : "Remove"}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex-shrink-0 text-xs font-semibold text-brand-600 underline underline-offset-2 whitespace-nowrap"
            >
              {lang === "bn" ? "সব মুছুন" : "Clear all"}
            </button>
          </div>
        )}
      </div>

      <ProductFilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        chips={chips}
        category={category}
        onCategoryChange={handleCategoryChange}
        chipRows={chipRows}
        onSubcategoryChange={handleSubcategoryChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        resultCount={total}
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3" aria-busy="true">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" aria-hidden />
          <p className="text-sm text-gray-400">{t("loading_products")}</p>
          <div className={cn("grid gap-4 w-full mt-4", viewMode === "grid" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1")}>
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-24 glass rounded-2xl p-8" role="alert">
          <p className="text-gray-600 font-semibold mb-1">{t("error_generic")}</p>
          <p className="text-gray-400 text-sm mb-5">{lang === "bn" ? "সার্ভার শীঘ্রই চালু হবে — আবার চেষ্টা করুন।" : "Server may be starting — please retry."}</p>
          <button type="button" onClick={() => load(1)} className="btn btn-brand btn-md btn-ripple">{lang === "bn" ? "আবার চেষ্টা" : "Retry"}</button>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Search}
          title={lang === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}
          actionLabel={lang === "bn" ? "ফিল্টার মুছুন" : "Clear filters"}
          onAction={clearAllFilters}
        />
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-5">{total} {lang === "bn" ? "টি পণ্য" : "products"}</p>
          <div className={cn("gap-4", viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "flex flex-col")}>
            {products.map((p, i) => (
              <Reveal key={p.id ?? p.slug} as="div" delay={(i % 8) * 45} className="h-full">
                <ProductCard product={p} onAddToCart={openCart} layout={viewMode} />
              </Reveal>
            ))}
          </div>
          {loadingMore && infiniteScroll && (
            <div className="flex justify-center py-8" aria-live="polite">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
          )}
          {infiniteScroll && <div ref={sentinelRef} className="h-4" aria-hidden />}
          {!infiniteScroll && totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-10">
              <button type="button" disabled={page === 1} onClick={() => load(page - 1)} className="btn btn-outline btn-md">{lang === "bn" ? "আগে" : "Previous"}</button>
              <span className="px-4 py-2 text-sm text-gray-600 self-center">{lang === "bn" ? "পৃষ্ঠা" : "Page"} {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => load(page + 1)} className="btn btn-outline btn-md">{lang === "bn" ? "পরে" : "Next"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
