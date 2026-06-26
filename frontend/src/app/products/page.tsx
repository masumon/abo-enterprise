"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { productsApi } from "@/lib/api";
import type { Product, ProductCategory } from "@/types";
import ProductCard from "@/components/features/ProductCard";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "accessories", label: "Accessories" },
  { value: "gadgets", label: "Gadgets" },
  { value: "electronics", label: "Electronics" },
  { value: "computer", label: "Computer" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { openCart } = useCartStore();

  const load = async () => {
    setLoading(true);
    try {
      const r = await productsApi.list({ category: category || undefined, page });
      setProducts(r.data.data ?? []);
      setTotal(r.data.meta?.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category, page]);

  const filtered = search.trim()
    ? products.filter(p =>
        p.name_en.toLowerCase().includes(search.toLowerCase()) ||
        p.name_bn.includes(search)
      )
    : products;

  return (
    <main className="min-h-screen">
      {/* Page Header */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Our Products</h1>
          <p className="text-brand-100 text-lg">Quality accessories & electronics at the best prices</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input pl-10 w-full"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value as ProductCategory | ""); setPage(1); }}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  category === c.value
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No products found</p>
            {search && <button onClick={() => setSearch("")} className="mt-3 text-brand-600 text-sm hover:underline">Clear search</button>}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">{total} products</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={openCart} />
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {total > 20 && !search && (
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
