"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Loader2, LayoutGrid, List } from "lucide-react";
import type { Product, ProductCategory } from "@/types";
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
import { isConstrainedNetwork } from "@/lib/networkStatus";

const CATEGORIES: { value: string; label: { en: string; bn: string } }[] = [
  { value: "", label: { en: "All", bn: "সব" } },
  { value: "accessories", label: { en: "Accessories", bn: "এক্সেসরিজ" } },
  { value: "gadgets", label: { en: "Gadgets", bn: "গ্যাজেট" } },
  { value: "electronics", label: { en: "Electronics", bn: "ইলেকট্রনিক্স" } },
  { value: "computer", label: { en: "Computer", bn: "কম্পিউটার" } },
];

interface Props {
  initialProducts: Product[];
  initialTotal: number;
  initialPage?: number;
  initialCategory?: ProductCategory | "";
  initialIsDemo?: boolean;
}

export default function ProductsClient({
  initialProducts,
  initialTotal,
  initialPage = 1,
  initialCategory = "",
  initialIsDemo = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguageStore();
  const t = useT();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<ProductCategory | "">(initialCategory);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [usingDemo, setUsingDemo] = useState(initialIsDemo);
  const [catalogSource, setCatalogSource] = useState<CatalogSource>(initialIsDemo ? "demo" : "api");
  const { openCart } = useCartStore();
  const infiniteScroll = useFeatureFlag("feature_infinite_scroll");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const needsApiRefresh = useRef(initialIsDemo || initialProducts.length === 0);
  const urlCategory = searchParams.get("category") ?? "";

  useEffect(() => {
    if (!initialIsDemo && initialProducts.length > 0) {
      const key = productsCacheKey({
        category: initialCategory || undefined,
        page: initialPage,
      });
      cacheApiResponse(key, { products: initialProducts, total: initialTotal }).catch(() => {});
    }
  }, [initialIsDemo, initialProducts, initialTotal, initialCategory, initialPage]);

  useEffect(() => {
    setProducts(initialProducts);
    setTotal(initialTotal);
    setCategory(initialCategory);
    setUsingDemo(initialIsDemo);
    setCatalogSource(initialIsDemo ? "demo" : "api");
    isFirstLoad.current = true;
    needsApiRefresh.current = initialIsDemo || initialProducts.length === 0;
  }, [initialProducts, initialTotal, initialCategory, initialIsDemo]);

  useEffect(() => {
    const next =
      urlCategory && CATEGORIES.some((c) => c.value === urlCategory)
        ? (urlCategory as ProductCategory)
        : "";
    setCategory((prev) => (prev === next ? prev : next));
  }, [urlCategory]);

  const handleCategoryChange = (value: ProductCategory | "") => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("category", value);
    else params.delete("category");
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(false);

    const params = {
      category: category || undefined,
      search: debouncedSearch || undefined,
      sort_by: sortBy || undefined,
      page: pageNum,
    };

    if (!append && pageNum === 1 && isConstrainedNetwork()) {
      const cached = await peekCachedProducts(params);
      if (cached) {
        setProducts(cached.products);
        setTotal(cached.total);
        setUsingDemo(cached.source === "demo");
        setCatalogSource(cached.source);
        setLoading(false);
      }
    }

    try {
      const result = await loadProducts(params);
      setProducts((prev) => (append ? [...prev, ...result.products] : result.products));
      setTotal(result.total);
      setUsingDemo(result.source === "demo");
      setCatalogSource(result.source);
      setPage(pageNum);
    } catch {
      setError(true);
      setUsingDemo(false);
      setCatalogSource("api");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, debouncedSearch, sortBy]);

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
      <DemoModeBanner show={(usingDemo || catalogSource === "cache") && !loading} source={catalogSource} />

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
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" aria-hidden />
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => handleCategoryChange(c.value as ProductCategory | "")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
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
