"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { productsApi } from "@/lib/api";
import type { Product, ProductCategory } from "@/types";
import ProductCard from "@/components/features/ProductCard";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { openCart } = useCartStore();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
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

  const handleCategoryChange = (cat: ProductCategory | "") => {
    setCategory(cat);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <main className="min-h-screen">
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {lang === "bn" ? "আমাদের পণ্য" : "Our Products"}
          </h1>
          <p className="text-brand-100 text-lg">
            {lang === "bn"
              ? "সেরা দামে মানসম্মত এক্সেসরিজ ও ইলেকট্রনিক্স"
              : "Quality accessories & electronics at the best prices"}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={lang === "bn" ? "পণ্য খুঁজুন..." : "Search products..."}
              className="input pl-10 w-full"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => handleCategoryChange(c.value as ProductCategory | "")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  category === c.value
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {lang === "bn" ? c.label.bn : c.label.en}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="input w-auto text-sm flex-shrink-0"
          >
            <option value="">{lang === "bn" ? "সাজান: ডিফল্ট" : "Sort: Default"}</option>
            <option value="price_asc">{lang === "bn" ? "দাম: কম থেকে বেশি" : "Price: Low to High"}</option>
            <option value="price_desc">{lang === "bn" ? "দাম: বেশি থেকে কম" : "Price: High to Low"}</option>
            <option value="newest">{lang === "bn" ? "নতুন আগে" : "Newest First"}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <SlidersHorizontal className="w-7 h-7 text-red-300" />
            </div>
            <p className="text-gray-600 font-semibold mb-1">সার্ভার সংযোগ হচ্ছে না</p>
            <p className="text-gray-400 text-sm mb-5">Backend may be starting up (30–60s). Please try again.</p>
            <button onClick={() => load()} className="btn btn-brand btn-md">
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No products found</p>
            {search && (
              <button onClick={() => handleSearchChange("")} className="mt-3 text-brand-600 text-sm hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">{total} product{total !== 1 ? "s" : ""}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={openCart} />
              ))}
            </div>
          </>
        )}

        {total > 20 && !debouncedSearch && (
          <div className="flex justify-center gap-3 mt-10">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn btn-outline btn-md">Previous</button>
            <span className="px-4 py-2 text-sm text-gray-600 self-center">Page {page}</span>
            <button disabled={products.length < 20} onClick={() => setPage(p => p + 1)} className="btn btn-outline btn-md">Next</button>
          </div>
        )}
      </div>
    </main>
  );
}
