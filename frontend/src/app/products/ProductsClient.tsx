"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Loader2, LayoutGrid, List } from "lucide-react";
import type { Category, Product, Subcategory } from "@/types";
import ProductCard from "@/components/features/ProductCard";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import LoadingProgress from "@/components/ui/LoadingProgress";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";
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

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1">
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
        {/* Category pills — horizontal scroll on mobile so they never wrap
            to a second row (saves ~44px of above-the-fold space) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5 sm:flex-wrap sm:overflow-visible">
          <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden />
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleCategoryChange(c.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                category === c.value ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-brand-50 border border-gray-100"
              )}
            >
              {lang === "bn" ? c.label.bn : c.label.en}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-products" className="sr-only">{t("sort_default")}</label>
          <select
            id="sort-products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input text-sm w-auto"
          >
            <option value="">{t("sort_default")}</option>
            <option value="price_asc">{lang === "bn" ? "দাম: কম→বেশি" : "Price: Low→High"}</option>
            <option value="price_desc">{lang === "bn" ? "দাম: বেশি→কম" : "Price: High→Low"}</option>
            <option value="newest">{lang === "bn" ? "নতুন আগে" : "Newest"}</option>
          </select>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden" role="group" aria-label={lang === "bn" ? "ভিউ মোড" : "View mode"}>
            <button type="button" onClick={() => setViewMode("grid")} className={cn("p-2.5", viewMode === "grid" ? "bg-brand-600 text-white" : "bg-white text-gray-500")} aria-label={t("grid_view")} aria-pressed={viewMode === "grid"}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setViewMode("list")} className={cn("p-2.5", viewMode === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-500")} aria-label={t("list_view")} aria-pressed={viewMode === "list"}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cascading taxonomy chips — one row per depth level along the
          selected path, so any nesting depth stays browsable in place */}
      {chipRows.map((row, i) => (
        <div
          key={row.key}
          className={cn(
            "flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1",
            i === 0 ? "-mt-4" : "-mt-4 sm:-mt-2",
            i === chipRows.length - 1 ? "mb-8" : "mb-6"
          )}
        >
          <button
            type="button"
            onClick={() => handleSubcategoryChange(row.allValue)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0",
              !row.active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
            )}
          >
            {lang === "bn" ? "সব" : "All"}
          </button>
          {row.items.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSubcategoryChange(s.slug)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0",
                row.active === s.slug ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
              )}
            >
              {lang === "bn" && s.name_bn ? s.name_bn : s.name_en}
            </button>
          ))}
        </div>
      ))}

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
        <div className="text-center py-20 glass rounded-2xl">
          <p className="text-gray-500">{lang === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-5">{total} {lang === "bn" ? "টি পণ্য" : "products"}</p>
          <div className={cn("gap-4", viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "flex flex-col")}>
            {products.map((p) => (
              <ProductCard key={p.id ?? p.slug} product={p} onAddToCart={openCart} layout={viewMode} />
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
