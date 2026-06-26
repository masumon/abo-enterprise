"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, SlidersHorizontal, Loader2, LayoutGrid, List } from "lucide-react";
import { productsApi } from "@/lib/api";
import type { Product, ProductCategory } from "@/types";
import ProductCard from "@/components/features/ProductCard";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";

const CATEGORIES: { value: string; label: { en: string; bn: string } }[] = [
  { value: "", label: { en: "All", bn: "সব" } },
  { value: "accessories", label: { en: "Accessories", bn: "এক্সেসরিজ" } },
  { value: "gadgets", label: { en: "Gadgets", bn: "গ্যাজেট" } },
  { value: "electronics", label: { en: "Electronics", bn: "ইলেকট্রনিক্স" } },
  { value: "computer", label: { en: "Computer", bn: "কম্পিউটার" } },
];

export default function ProductsPage() {
  const { lang } = useLanguageStore();
  const t = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { openCart } = useCartStore();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await productsApi.list({
        category: category || undefined,
        search: debouncedSearch || undefined,
        sort_by: sortBy || undefined,
        page,
      });
      setProducts(r.data.data ?? []);
      setTotal(r.data.meta?.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch, sortBy, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("products_title")}</h1>
          <p className="text-brand-100 text-lg">{t("products_sub")}</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={lang === "bn" ? "পণ্য খুঁজুন..." : "Search products..."}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value as ProductCategory | ""); setPage(1); }}
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
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="input text-sm w-auto">
              <option value="">{t("sort_default")}</option>
              <option value="price_asc">{lang === "bn" ? "দাম: কম→বেশি" : "Price: Low→High"}</option>
              <option value="price_desc">{lang === "bn" ? "দাম: বেশি→কম" : "Price: High→Low"}</option>
              <option value="newest">{lang === "bn" ? "নতুন আগে" : "Newest"}</option>
            </select>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={cn("p-2.5", viewMode === "grid" ? "bg-brand-600 text-white" : "bg-white text-gray-500")} aria-label={t("grid_view")}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={cn("p-2.5", viewMode === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-500")} aria-label={t("list_view")}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-400">{t("loading_products")}</p>
            <div className={cn("grid gap-4 w-full mt-4", viewMode === "grid" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1")}>
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-24 glass rounded-2xl p-8">
            <p className="text-gray-600 font-semibold mb-1">{t("error_generic")}</p>
            <p className="text-gray-400 text-sm mb-5">{lang === "bn" ? "সার্ভার শীঘ্রই চালু হবে — আবার চেষ্টা করুন।" : "Server may be starting — please retry."}</p>
            <button onClick={() => load()} className="btn btn-brand btn-md btn-ripple">{lang === "bn" ? "আবার চেষ্টা" : "Retry"}</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <p className="text-gray-500">{lang === "bn" ? "কোনো পণ্য পাওয়া যায়নি" : "No products found"}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">{total} {lang === "bn" ? "টি পণ্য" : "products"}</p>
            <div className={cn(
              "gap-4",
              viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "flex flex-col"
            )}>
              {products.map((p) => (
                <ProductCard key={p.id ?? p.slug} product={p} onAddToCart={openCart} layout={viewMode} />
              ))}
            </div>
          </>
        )}

        {total > 20 && (
          <div className="flex justify-center gap-3 mt-10">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn btn-outline btn-md">{lang === "bn" ? "আগে" : "Previous"}</button>
            <span className="px-4 py-2 text-sm text-gray-600 self-center">{lang === "bn" ? "পৃষ্ঠা" : "Page"} {page}</span>
            <button disabled={products.length < 20} onClick={() => setPage((p) => p + 1)} className="btn btn-outline btn-md">{lang === "bn" ? "পরে" : "Next"}</button>
          </div>
        )}
      </div>
    </main>
  );
}
