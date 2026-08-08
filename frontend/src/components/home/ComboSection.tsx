"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Truck, ShoppingCart, X, ChevronRight } from "lucide-react";
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
  description_en?: string | null;
  description_bn?: string | null;
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
  const [detail, setDetail] = useState<Combo | null>(null);

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
    setDetail(null);
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
                {/* Tapping the image or the info opens the details popup */}
                <button
                  type="button"
                  onClick={() => setDetail(c)}
                  aria-label={bn ? `${title} — বিস্তারিত দেখুন` : `${title} — view details`}
                  className="text-left flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
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
                      {c.items.length} {bn ? "টি পণ্য" : c.items.length === 1 ? "item" : "items"} · <span className="text-brand-600 dark:text-brand-300 font-semibold">{bn ? "বিস্তারিত" : "Details"}</span>
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="money text-lg sm:text-xl font-extrabold text-brand-600 dark:text-brand-300">{formatPrice(c.combo_price)}</span>
                      {save > 0 && (
                        <span className="money text-xs text-gray-400 line-through">{formatPrice(c.compare_at_price!)}</span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <button
                    type="button"
                    onClick={() => handleAdd(c)}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-500 text-[#14182b] text-xs sm:text-sm font-bold hover:bg-accent-600 active:scale-95 transition-all"
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

      {detail && (
        <ComboDetailModal combo={detail} bn={bn} onClose={() => setDetail(null)} onAdd={() => handleAdd(detail)} />
      )}
    </section>
  );
}

/** Details popup: what's inside the bundle, per-item prices, and the saving. */
function ComboDetailModal({ combo, bn, onClose, onAdd }: { combo: Combo; bn: boolean; onClose: () => void; onAdd: () => void }) {
  const title = bn ? combo.title_bn : combo.title_en;
  const description = bn ? combo.description_bn : combo.description_en;
  const itemsTotal = combo.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const compare = combo.compare_at_price && combo.compare_at_price > combo.combo_price ? combo.compare_at_price : (itemsTotal > combo.combo_price ? itemsTotal : 0);
  const save = compare ? Math.round(compare - combo.combo_price) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#141930] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl">
          {combo.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={combo.image_url} alt={title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 flex items-center justify-center">
              <Package className="w-10 h-10 text-accent-400" aria-hidden />
            </div>
          )}
          <button type="button" onClick={onClose} aria-label={bn ? "বন্ধ করুন" : "Close"} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
            <X className="w-5 h-5" />
          </button>
          {combo.free_delivery && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow">
              <Truck className="w-3.5 h-3.5" aria-hidden /> {bn ? "ফ্রি ডেলিভারি" : "Free delivery"}
            </span>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-xl font-extrabold text-heading leading-tight">{title}</h3>
            {description && <p className="text-sm text-muted mt-1 whitespace-pre-line">{description}</p>}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              {bn ? "এই প্যাকে যা থাকছে" : "What's inside"} ({combo.items.length})
            </p>
            <div className="space-y-2">
              {combo.items.map((it) => {
                const row = (
                  <>
                    <div className="w-12 h-12 rounded-lg bg-brand-50 dark:bg-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-brand-300" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{bn ? it.name_bn : it.name_en}</p>
                      <p className="text-xs text-muted">{formatPrice(it.price)} × {it.quantity}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-500 flex-shrink-0" aria-hidden />
                  </>
                );
                // Link to the product page when we have a slug; otherwise render
                // a plain row so a combo with a hard-deleted product still shows.
                return it.slug ? (
                  <Link
                    key={it.product_id}
                    href={`/products/${it.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 -mx-2 px-2 py-1.5 rounded-lg hover:bg-brand-50/60 dark:hover:bg-white/5 transition-colors"
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={it.product_id} className="flex items-center gap-3 px-2 py-1.5">{row}</div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-1.5">{bn ? "পণ্যে ট্যাপ করে বিস্তারিত দেখুন" : "Tap a product to view its page"}</p>
          </div>

          <div className="flex items-end justify-between pt-3 border-t border-[var(--line)]">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="money text-2xl font-extrabold text-brand-600 dark:text-brand-300">{formatPrice(combo.combo_price)}</span>
                {compare > 0 && <span className="money text-sm text-gray-400 line-through">{formatPrice(compare)}</span>}
              </div>
              {save > 0 && (
                <span className="inline-block mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {bn ? `৳${save} সাশ্রয়` : `Save ৳${save}`}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onAdd}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-500 text-[#14182b] font-bold hover:bg-accent-600 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-5 h-5" aria-hidden />
            {bn ? "কার্টে যোগ করুন" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
