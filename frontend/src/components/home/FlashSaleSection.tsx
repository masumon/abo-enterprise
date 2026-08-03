"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import ProductCard from "@/components/features/ProductCard";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import type { Product } from "@/types";
import CountdownTimer, { resolveFlashSaleEnd, isFlashSaleActive, type CountdownSize } from "@/components/ui/CountdownTimer";
import { productsApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";

export default function FlashSaleSection() {
  const { lang } = useLanguageStore();
  const t = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const flashSaleEnabled = useFeatureFlag("feature_flash_sale");
  const { settings } = usePublicSettings();

  const flashStart = getSettingValue(settings, "flash_sale_start");
  const flashEnd = resolveFlashSaleEnd(getSettingValue(settings, "flash_sale_end"));
  const saleActive = isFlashSaleActive(flashStart, flashEnd);
  const flashTitle = lang === "bn"
    ? getSettingValue(settings, "flash_sale_title_bn") || "ফ্ল্যাশ সেল চলছে"
    : getSettingValue(settings, "flash_sale_title_en") || "Flash Sale";

  useEffect(() => {
    if (!flashSaleEnabled) {
      setLoading(false);
      return;
    }

    productsApi
      .list({ flash_sale: true, per_page: 8, page: 1 })
      .then((r) => {
        const items = r.data.data ?? [];
        setProducts(items.slice(0, 8));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [flashSaleEnabled]);

  if (!flashSaleEnabled || !saleActive) {
    return null;
  }

  return (
    <section id="flash-sale" className="py-12 bg-gradient-to-b from-transparent to-gray-50 dark:to-white/5 scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>🔥</span>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-heading">
                {flashTitle}
              </h2>
            </div>
          </div>
          {saleActive && (
            <div className="hidden sm:block">
              <CountdownTimer endDate={flashEnd} size="md" />
            </div>
          )}
        </div>

        {/* Mobile Countdown */}
        {saleActive && (
          <div className="sm:hidden mb-6 flex justify-center">
            <CountdownTimer endDate={flashEnd} size="sm" />
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-8">
              {products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} density="compact" />
              ))}
            </div>

            {/* View All Button */}
            <div className="flex justify-center">
              <Link
                href="/products?flash_sale=true"
                className="btn btn-outline btn-lg gap-2"
              >
                {lang === "bn" ? "সব ফ্ল্যাশ সেল দেখুন" : "View All Flash Sales"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
