"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import ProductCard from "@/components/features/ProductCard";
import type { Product } from "@/types";
import CountdownTimer from "@/components/ui/CountdownTimer";
import { productsApi } from "@/lib/api";
import { usePublicSettings, getSettingValue, refreshPublicSettings } from "@/hooks/usePublicSettings";
import { getFlashSaleStatus } from "@/lib/flashSale";
import PromoSlider from "@/components/ui/PromoSlider";

/** How often the open homepage re-checks the admin's flash-sale settings. */
const POLL_MS = 60_000;
/** setTimeout's max delay (~24.8 days); longer waits are re-armed. */
const MAX_TIMEOUT = 2_147_000_000;

/**
 * Homepage flash-sale band.
 *
 * Visibility rules (see lib/flashSale.ts, unit-tested):
 *   switch ON  +  now inside [start, end) in Bangladesh time  +  ≥1 live product.
 * The decision is made only on the client after mount and only once fresh
 * settings AND the product list are known, so the band never flashes in and
 * then disappears, and server HTML / first client render agree (no hydration
 * mismatch). It hides itself exactly when the countdown hits zero, appears by
 * itself when a scheduled start arrives, and re-reads the admin settings every
 * 60 s (and when the tab regains focus).
 */
export default function FlashSaleSection() {
  const { lang } = useLanguageStore();
  const { settings: hookSettings, loading: settingsLoading } = usePublicSettings();
  const [polled, setPolled] = useState<Record<string, string> | null>(null);
  const settings = polled ?? hookSettings;
  // null until mounted → identical (empty) output on server and first paint.
  const [now, setNow] = useState<number | null>(null);
  // null = not loaded yet; [] = loaded, nothing on sale.
  const [products, setProducts] = useState<Product[] | null>(null);

  const settingsReady = !settingsLoading && Object.keys(settings).length > 0;
  const status = now !== null && settingsReady ? getFlashSaleStatus(settings, now) : null;
  const state = status?.state;
  const live = state === "live";

  // Read the clock right after mount, then again exactly when the state is
  // due to change (scheduled start, or end).
  const mounted = now !== null;
  const msUntilChange = status?.msUntilChange ?? null;
  useEffect(() => {
    if (mounted && msUntilChange === null) return;
    const delay = mounted ? Math.min(msUntilChange! + 50, MAX_TIMEOUT) : 0;
    const id = setTimeout(() => setNow(Date.now()), delay);
    return () => clearTimeout(id);
  }, [mounted, msUntilChange, state]);

  const loadProducts = useCallback(() => {
    productsApi
      .list({ flash_sale: true, per_page: 8, page: 1 })
      .then((r) => setProducts((r.data.data ?? []).slice(0, 8)))
      // Keep what is already shown on a transient error; first failure → hide.
      .catch(() => setProducts((prev) => prev ?? []));
  }, []);

  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
    if (live) loadProducts();
  }, [live, loadProducts]);

  // Pick up admin changes (on/off, start/end, products) without a reload.
  useEffect(() => {
    const refresh = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refreshPublicSettings()
        .then((fresh) => {
          if (fresh && Object.keys(fresh).length > 0) setPolled(fresh);
          setNow(Date.now());
        })
        .catch(() => {});
      if (liveRef.current) loadProducts();
    };
    const id = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadProducts]);

  const handleExpire = useCallback(() => setNow(Date.now()), []);

  const flashTitle = lang === "bn"
    ? getSettingValue(settings, "flash_sale_title_bn") || "ফ্ল্যাশ সেল চলছে"
    : getSettingValue(settings, "flash_sale_title_en") || "Flash Sale";

  // OFF, scheduled, expired, invalid dates, settings/products still loading,
  // or nothing on sale → render nothing at all.
  if (!live || !status?.end || !products || products.length === 0) {
    return null;
  }
  const flashEnd = status.end;

  return (
    <section id="flash-sale" className="relative py-5 sm:py-7 overflow-hidden bg-gradient-to-br from-brand-50 via-white to-amber-50/70 dark:from-[var(--surface)] dark:via-[var(--surface)] dark:to-[var(--surface)] scroll-mt-[calc(var(--navbar-offset)+3.5rem)]">
      {/* Ambient multicolour glow — decorative, tuned for a light surface so it
          sits with the rest of the homepage instead of a dark island. */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-brand-400/15 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" aria-hidden />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <span className="relative flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#f4dfa0] via-[#d4af37] to-[#a3801f] shadow-lg shadow-amber-500/30 ring-1 ring-white/40 flex items-center justify-center">
              <span className="text-xl sm:text-2xl" aria-hidden>🔥</span>
              <span className="absolute inset-0 rounded-2xl bg-[#d4af37] animate-ping opacity-20" aria-hidden />
            </span>
            <div>
              <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-brand-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent mb-0.5">
                {lang === "bn" ? "সীমিত সময়ের অফার" : "Limited Time Offer"}
              </span>
              <h2 className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-brand-600 via-fuchsia-600 to-amber-500 bg-clip-text text-transparent leading-tight drop-shadow-sm">
                {flashTitle}
              </h2>
            </div>
          </div>
          <div className="hidden sm:block">
            <CountdownTimer endDate={flashEnd} size="md" tone="gold" onExpire={handleExpire} />
          </div>
        </div>

        {/* Mobile Countdown */}
        <div className="sm:hidden mb-5 flex justify-center">
          <CountdownTimer endDate={flashEnd} size="sm" tone="gold" onExpire={handleExpire} />
        </div>

        {/* Admin-managed promo banner (Admin → Promo Slides, placement
            "flash_sale"). Renders nothing when no slide is configured. */}
        <PromoSlider placement="flash_sale" aspect="aspect-[3/1]" className="mb-6 sm:mb-8" />

        {/* Products Grid */}
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
      </div>
    </section>
  );
}
