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
    <section id="flash-sale" className="relative py-10 sm:py-12 overflow-hidden bg-gradient-to-br from-red-50 via-orange-50/60 to-transparent dark:from-red-950/20 dark:via-orange-950/10 dark:to-transparent scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
      {/* Ambient glow — purely decorative, no layout impact. */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-red-400/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" aria-hidden />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <span className="relative flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/30 flex items-center justify-center">
              <span className="text-xl sm:text-2xl" aria-hidden>🔥</span>
              <span className="absolute inset-0 rounded-2xl bg-red-500 animate-ping opacity-20" aria-hidden />
            </span>
            <div>
              <span className="inline-block text-[10px] sm:text-xs font-bold tracking-wide uppercase text-red-600 dark:text-red-400 mb-0.5">
                {lang === "bn" ? "সীমিত সময়ের অফার" : "Limited Time Offer"}
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent leading-tight">
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
          <div className="sm:hidden mb-5 flex justify-center">
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
                className="btn btn-lg gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white border-0 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35 hover:-translate-y-0.5 transition-all"
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
