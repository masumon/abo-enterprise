"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import ProductCard from "@/components/features/ProductCard";
import { productsApi } from "@/lib/api";
import type { Product } from "@/types";

export default function FeaturedProducts() {
  const { lang } = useLanguageStore();
  const { openCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.list({ featured: true, per_page: 8 } as Parameters<typeof productsApi.list>[0])
      .then(r => setProducts(r.data.data ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="products" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "জনপ্রিয় পণ্য" : "Featured Products"}</h2>
          <div className="section-divider" />
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {lang === "bn"
              ? "সেরা মানের মোবাইল এক্সেসরিজ ও গ্যাজেট — সরাসরি আপনার দোরগোড়ায়"
              : "Best quality mobile accessories and gadgets — delivered right to your door"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={openCart}
              />
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
