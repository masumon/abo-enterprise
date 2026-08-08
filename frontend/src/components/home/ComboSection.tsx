"use client";

import { useEffect, useState } from "react";
import { Package, Truck, ShoppingCart } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import { getApiBaseUrl } from "@/lib/apiBase";
import { formatPrice } from "@/lib/utils";

interface ComboItem {
  product_id: string;
  quantity: number;
  name_en: string;
  name_bn: string;
  slug: string;
  image_url?: string | null;
  price: number;
}
interface Combo {
  id: string;
  slug: string;
  title_en: string;
  title_bn: string;
  image_url?: string | null;
  combo_price: number;
  compare_at_price?: number | null;
  badge_en?: string | null;
  badge_bn?: string | null;
  free_delivery: boolean;
  items: ComboItem[];
}

/**
 * Homepage combo (bundle) offers — placed above Featured Products, two-up on
 * mobile. Renders nothing when no combos are configured, so the section costs
 * no space until an admin creates one. Ordering is taken over WhatsApp for now
 * (zero money-path risk); a cart/checkout combo flow can follow.
 */
export default function ComboSection() {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const addCombo = useCartStore((s) => s.addCombo);
  const openCart = useCartStore((s) => s.openCart);
  const [combos, setCombos] = useState<Combo[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`${getApiBaseUrl()}/api/v1/combos`, { signal: AbortSignal.timeout(15000) })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => { if (active) setCombos((j.data ?? []) as Combo[]); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (combos.length === 0) return null;

  const handleAdd = (c: Combo) => {
    addCombo({
      combo_id: c.id,
      title_en: c.title_en,
      title_bn: c.title_bn,
      price: c.combo_price,
      image_url: c.image_url ?? null,
      free_delivery: c.free_delivery,
    });
    openCart();
  };

  return (
    <section className="py-5 lg:py-7">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent mb-1">
              {bn ? "কম্বো অফার" : "Combo Offers"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-heading tracking-tight leading-tight">
              {bn ? "সাশ্রয়ী কম্বো প্যাক" : "Value Combo Packs"}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {combos.map((c) => {
            const title = bn ? c.title_bn : c.title_en;
            const badge = bn ? c.badge_bn : c.badge_en;
            const save = c.compare_at_price && c.compare_at_price > c.combo_price
              ? Math.round(c.compare_at_price - c.combo_price)
              : 0;
            return (
              <div key={c.id} className="enterprise-card overflow-hidden flex flex-col group">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image_url} alt={title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center overflow-hidden">
                      <span aria-hidden className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-accent-500/15 blur-2xl" />
                      <span className="relative w-12 h-12 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center">
                        <Package className="w-6 h-6 text-accent-400" aria-hidden />
                      </span>
                    </div>
                  )}
                  {badge && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent-500 text-[#14182b] text-[10px] font-bold shadow">
                      {badge}
                    </span>
                  )}
                  {c.free_delivery && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
                      <Truck className="w-3 h-3" aria-hidden /> {bn ? "ফ্রি" : "Free"}
                    </span>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-sm sm:text-base text-heading leading-snug line-clamp-2">{title}</h3>
                  <p className="text-[11px] sm:text-xs text-muted mt-0.5">
                    {c.items.length} {bn ? "টি পণ্য" : c.items.length === 1 ? "item" : "items"}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="money text-lg sm:text-xl font-extrabold text-brand-600 dark:text-brand-300">{formatPrice(c.combo_price)}</span>
                    {save > 0 && (
                      <span className="money text-xs text-gray-400 line-through">{formatPrice(c.compare_at_price!)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(c)}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-500 text-[#14182b] text-xs sm:text-sm font-bold hover:bg-accent-600 active:scale-95 transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" aria-hidden />
                    {bn ? "কার্টে যোগ করুন" : "Add to cart"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
