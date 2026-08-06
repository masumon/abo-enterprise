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
import PromoSlider from "@/components/ui/PromoSlider";

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

  // GAP — an active sale with zero qualifying products used to still render
  // the header, countdown and promo banner with an empty grid beneath them,
  // reading as broken. Once the fetch has settled, no products means nothing
  // to sell here right now, so the whole section steps aside.
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section id="flash-sale" className="relative py-8 sm:py-10 overflow-hidden bg-gradient-to-br from-brand-900 via-[#1a2456] to-brand-900 scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
      {/* Ambient gold glow — purely decorative, no layout impact. */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-[#d4af37]/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-[#d4af37]/10 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" aria-hidden />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <span className="relative flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#f4dfa0] via-[#d4af37] to-[#a3801f] shadow-lg shadow-black/40 ring-1 ring-white/10 flex items-center justify-center">
              <span className="text-xl sm:text-2xl" aria-hidden>🔥</span>
              <span className="absolute inset-0 rounded-2xl bg-[#d4af37] animate-ping opacity-20" aria-hidden />
            </span>
            <div>
              <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase text-[#d4af37] mb-0.5">
                {lang === "bn" ? "সীমিত সময়ের অফার" : "Limited Time Offer"}
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#f4dfa0] via-[#d4af37] to-[#f4dfa0] bg-clip-text text-transparent leading-tight">
                {flashTitle}
              </h2>
            </div>
          </div>
          {saleActive && (
            <div className="hidden sm:block">
              <CountdownTimer endDate={flashEnd} size="md" tone="gold" />
            </div>
          )}
        </div>

        {/* Mobile Countdown */}
        {saleActive && (
          <div className="sm:hidden mb-5 flex justify-center">
            <CountdownTimer endDate={flashEnd} size="sm" tone="gold" />
          </div>
        )}

        {/* Admin-managed promo banner (Admin → Promo Slides, placement
            "flash_sale"). Renders nothing when no slide is configured. */}
        <PromoSlider placement="flash_sale" aspect="aspect-[3/1]" className="mb-6 sm:mb-8" />

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
                className="btn btn-lg gap-2 bg-gradient-to-r from-[#f4dfa0] via-[#d4af37] to-[#f4dfa0] text-black font-bold border-0 shadow-lg shadow-black/40 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5 transition-all"
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
