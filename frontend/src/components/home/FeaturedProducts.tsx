"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import ProductCard from "@/components/features/ProductCard";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import type { Product } from "@/types";
import CountdownTimer, { getWeeklySaleEnd } from "@/components/ui/CountdownTimer";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import DemoModeBanner from "@/components/ui/DemoModeBanner";
import type { CatalogSource } from "@/lib/catalogLoader";
import { loadProducts, peekCachedProducts } from "@/lib/catalogLoader";
import { isConstrainedNetwork } from "@/lib/networkStatus";

export default function FeaturedProducts() {
  const { lang } = useLanguageStore();
  const { openCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const [catalogSource, setCatalogSource] = useState<CatalogSource>("api");
  const flashSaleEnabled = useFeatureFlag("feature_flash_sale");

  useEffect(() => {
    const params = { featured: true, per_page: 8 };

    if (isConstrainedNetwork()) {
      peekCachedProducts(params).then((cached) => {
        if (cached) {
          setProducts(cached.products);
          setUsingDemo(cached.source === "demo");
          setCatalogSource(cached.source);
          setLoading(false);
        }
      });
    }

    loadProducts(params)
      .then(async (result) => {
        if (result.products.length > 0) {
          setProducts(result.products);
          setUsingDemo(result.source === "demo");
          setCatalogSource(result.source);
          setError(false);
          return;
        }
        const fallback = await loadProducts({ per_page: 8 });
        if (fallback.products.length > 0) {
          setProducts(fallback.products);
          setUsingDemo(fallback.source === "demo");
          setCatalogSource(fallback.source);
          setError(false);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="products" className="py-16 gradient-surface">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          {flashSaleEnabled && (
            <div className="flex flex-col items-center gap-2 mb-2">
              <CountdownTimer endDate={getWeeklySaleEnd()} label={lang === "bn" ? "ফ্ল্যাশ সেল" : "Flash Sale"} />
            </div>
          )}
          <h2>{lang === "bn" ? "জনপ্রিয় পণ্য" : "Featured Products"}</h2>
          <div className="section-divider" />
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {lang === "bn"
              ? "সেরা মানের মোবাইল এক্সেসরিজ ও গ্যাজেট — সরাসরি আপনার দোরগোড়ায়"
              : "Best quality mobile accessories and gadgets — delivered right to your door"}
          </p>
        </div>

        <DemoModeBanner show={(usingDemo || catalogSource === "cache") && !loading} source={catalogSource} />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div role="alert" className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {lang === "bn" ? "পণ্য লোড করা যায়নি।" : "Could not load products."}
            </p>
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            {lang === "bn" ? "এখন কোনো জনপ্রিয় পণ্য নেই।" : "No featured products right now."}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={openCart} />
            ))}
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/products" className="btn btn-outline btn-lg">
            {lang === "bn" ? "সব পণ্য দেখুন" : "View All Products"}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
