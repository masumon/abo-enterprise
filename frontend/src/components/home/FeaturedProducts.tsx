"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import ProductCard from "@/components/features/ProductCard";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import ProductCategoryTabs from "@/components/home/ProductCategoryTabs";
import type { Product } from "@/types";
import DemoModeBanner from "@/components/ui/DemoModeBanner";
import type { CatalogSource } from "@/lib/catalogLoader";
import { loadProducts, peekCachedProducts } from "@/lib/catalogLoader";

// Homepage priority: Premium Gadgets → Mobile Accessories → Electronics → rest.
const CATEGORY_PRIORITY: Record<string, number> = {
  gadgets: 0,
  accessories: 1,
  electronics: 2,
  computer: 3,
};

function prioritizeProducts(items: Product[]): Product[] {
  return [...items].sort(
    (a, b) =>
      (CATEGORY_PRIORITY[a.category] ?? 99) - (CATEGORY_PRIORITY[b.category] ?? 99)
  );
}

export default function FeaturedProducts() {
  const { lang } = useLanguageStore();
  const { openCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [catalogSource, setCatalogSource] = useState<CatalogSource>("api");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    const params = { featured: true, per_page: 12 };

    peekCachedProducts(params).then((cached) => {
      if (cached) {
        setProducts(prioritizeProducts(cached.products));
        setCatalogSource(cached.source);
        setLoading(false);
      }
    });

    loadProducts(params)
      .then(async (result) => {
        if (result.products.length > 0) {
          setProducts(prioritizeProducts(result.products));
          setCatalogSource(result.source);
          setError(false);
          return;
        }
        const fallback = await loadProducts({ per_page: 12 });
        if (fallback.products.length > 0) {
          setProducts(prioritizeProducts(fallback.products));
          setCatalogSource(fallback.source);
          setError(false);
        }
      })
      .catch(async () => {
        const cached = await peekCachedProducts(params);
        if (cached) {
          setProducts(prioritizeProducts(cached.products));
          setCatalogSource(cached.source);
          setError(false);
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter products by category
  useEffect(() => {
    if (activeCategory === "all") {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter((p) => p.category?.toLowerCase().includes(activeCategory))
      );
    }
  }, [products, activeCategory]);

  return (
    <section id="featured-products" className="py-6 lg:py-9 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-3 lg:px-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="flex items-center gap-2 text-lg sm:text-2xl font-bold text-heading">
            <span className="w-1.5 h-5 sm:h-7 rounded-full bg-gradient-to-b from-accent-400 to-accent-600" aria-hidden />
            {lang === "bn" ? "ফিচার্ড প্রোডাক্টস" : "Featured Products"}
          </h2>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-300 whitespace-nowrap px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
          >
            {lang === "bn" ? "সব দেখুন" : "View all"}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mb-6 -mx-3 lg:mx-0">
          <ProductCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        <DemoModeBanner show={catalogSource === "cache" && !loading} source={catalogSource} />

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div role="alert" className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {lang === "bn" ? "পণ্য লোড করা যায়নি।" : "Could not load products."}
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            {lang === "bn" ? "এই ক্যাটেগরিতে কোনো পণ্য নেই।" : "No products in this category."}
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {filteredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={openCart} density="compact" />
            ))}
          </div>
        )}

        <div className="text-center mt-8 lg:mt-12">
          <Link href="/products" className="btn btn-outline btn-lg gap-2">
            {lang === "bn" ? "সব পণ্য দেখুন" : "View All Products"}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
