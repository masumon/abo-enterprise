"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, AlertTriangle, ArrowLeft, Truck, CheckCircle2, Package } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { formatPrice } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";
import EmptyState from "@/components/ui/EmptyState";
import { productsApi } from "@/lib/api";
import { validateCoupon, type AppliedCoupon } from "@/lib/coupons";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";

export default function CartPage() {
  const { items, combos, updateQuantity, removeItem, updateComboQty, removeCombo, total, comboTotal, stockWarnings, setStockWarnings } = useCartStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const router = useRouter();
  const couponsEnabled = useFeatureFlag("feature_coupons", true);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // M4 — mirrors checkout/page.tsx's guard: the store already rehydrates at
  // app mount (StoreHydration.tsx), but this page can paint before that
  // finishes, showing "cart is empty" for a returning visitor who actually
  // has items. Wait for an explicit rehydrate before trusting items.length.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  // L1 — same free-delivery threshold checkout bills from
  // (free_delivery_min_amount), shown as a nudge before the customer even
  // reaches checkout rather than as a surprise on the delivery-charge line.
  const { settings: deliverySettings } = usePublicSettings(["free_delivery_min_amount"]);
  const freeDeliveryMin = Number(getSettingValue(deliverySettings, "free_delivery_min_amount") || NaN);

  // Coupons discount products only (matches the backend); the combo subtotal is
  // added on top of the product figure the coupon was validated against.
  const cartSubtotal = total();
  const comboSubtotal = comboTotal();
  const discount = appliedCoupon?.discountAmount ?? 0;
  const cartTotal = cartSubtotal - discount + comboSubtotal;
  const hasContents = items.length > 0 || combos.length > 0;

  useEffect(() => {
    if (items.length === 0) {
      setStockWarnings([]);
      return;
    }
    setValidating(true);
    productsApi.validateStock(items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })))
      .then((r) => {
        const issues = (r.data.data?.items ?? []).filter((i) => i.error);
        setStockWarnings(issues.map((i) => i.product_id));
        for (const issue of issues) {
          if (issue.available !== undefined && issue.product_id) {
            updateQuantity(issue.product_id, issue.available);
          }
        }
      })
      .catch(() => {})
      .finally(() => setValidating(false));
  }, [items, setStockWarnings, updateQuantity]);

  // GAP-02 — the rejection was previously swallowed, so an invalid, expired or
  // below-minimum coupon produced no message at all. Checkout already surfaces
  // this error (checkout/page.tsx:146-152); the cart is brought up to match it.
  const applyCoupon = async () => {
    if (!couponsEnabled || !coupon.trim()) return;
    setCouponError(null);
    try {
      setAppliedCoupon(await validateCoupon(coupon, cartSubtotal));
    } catch (err) {
      const msg = (err as Error).message || "Invalid coupon";
      // Translate error reasons to user's language
      const errorMap: Record<string, { en: string; bn: string }> = {
        "Coupon does not exist": { en: "Coupon does not exist", bn: "এই কুপন নেই" },
        "Coupon has expired": { en: "Coupon has expired", bn: "কুপনের মেয়াদ শেষ" },
        "Order total is below minimum amount": { en: "Order amount too low", bn: "অর্ডার সর্বনিম্ন পরিমাণের নিচে" },
        "Coupon has already been used": { en: "Coupon already used", bn: "এই কুপন আগে ব্যবহৃত" },
        "Invalid coupon": { en: "Invalid coupon", bn: "অবৈধ কুপন" },
      };
      const translated = errorMap[msg] || { en: msg, bn: msg };
      setCouponError(lang === "bn" ? translated.bn : translated.en);
    }
  };

  return (
    <main>
      <PageHero
        pageKey="cart"
        title={lang === "bn" ? "শপিং কার্ট" : "Shopping Cart"}
        subtitle={lang === "bn" ? `${items.length + combos.length}টি পণ্য` : `${items.length + combos.length} items`}
        breadcrumbs={[{ label: lang === "bn" ? "কার্ট" : "Cart" }]}
        variant="light"
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-5xl">
          {!hydrated ? null : !hasContents ? (
            <EmptyState
              icon={ShoppingBag}
              title={lang === "bn" ? "কার্ট খালি" : "Your cart is empty"}
              description={lang === "bn" ? "পণ্য যোগ করে শপিং শুরু করুন" : "Add products to start shopping"}
              actionLabel={lang === "bn" ? "পণ্য দেখুন" : "Browse Products"}
              actionHref="/products"
            />
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {validating && (
                  <p className="text-xs text-brand-600 text-center">{lang === "bn" ? "স্টক যাচাই হচ্ছে..." : "Checking stock..."}</p>
                )}
                {stockWarnings.length > 0 && (
                  <div role="alert" className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-800 text-xs rounded-xl px-3 py-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{lang === "bn" ? "কিছু পণ্যের স্টক সীমিত।" : "Some items have limited stock."}</span>
                  </div>
                )}

                {items.map((item) => (
                  <div key={item.product_id} className="enterprise-card p-4 flex gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={lang === "bn" ? item.name_bn : item.name_en} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/*
                        The line total used to sit in its own flex column beside
                        this one. Nothing in that column could shrink — the
                        quantity stepper and the Remove label have a hard
                        minimum — so on a 360px phone the row grew wider than
                        the screen and the total was cut off at the edge, on the
                        one page where the number is the whole point.

                        It now sits on the title's line inside this column, and
                        every row below it wraps, so the card cannot outgrow the
                        viewport at any width.
                      */}
                      <div className="flex items-start gap-2">
                        <h3 className="flex-1 min-w-0 font-semibold text-heading line-clamp-2">
                          {lang === "bn" ? item.name_bn : item.name_en}
                        </h3>
                        <p className="money font-bold text-heading flex-shrink-0 whitespace-nowrap">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="money">{formatPrice(item.price)}</span>
                        {" × "}
                        {item.quantity}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-lg">
                          <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5" aria-label="Decrease">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5" aria-label="Increase">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.product_id)} className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" />
                          {lang === "bn" ? "সরান" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {combos.map((c) => (
                  <div key={c.combo_id} className="enterprise-card p-4 flex gap-4 border-accent-200/70 dark:border-accent-500/25">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center flex-shrink-0">
                      {c.image_url ? (
                        <Image src={c.image_url} alt={lang === "bn" ? c.title_bn : c.title_en} fill className="object-cover" sizes="80px" />
                      ) : (
                        <Package className="w-8 h-8 text-accent-400" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="flex-1 min-w-0 font-semibold text-heading line-clamp-2">
                          <span className="text-accent-600 dark:text-accent-300">{lang === "bn" ? "কম্বো" : "Combo"}</span> · {lang === "bn" ? c.title_bn : c.title_en}
                        </h3>
                        <p className="money font-bold text-heading flex-shrink-0 whitespace-nowrap">
                          {formatPrice(c.price * c.quantity)}
                        </p>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="money">{formatPrice(c.price)}</span>
                        {" × "}
                        {c.quantity}
                        {c.free_delivery && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">{lang === "bn" ? "ফ্রি ডেলিভারি" : "Free delivery"}</span>}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-lg">
                          <button type="button" onClick={() => updateComboQty(c.combo_id, c.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5" aria-label="Decrease">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{c.quantity}</span>
                          <button type="button" onClick={() => updateComboQty(c.combo_id, c.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5" aria-label="Increase">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button type="button" onClick={() => removeCombo(c.combo_id)} className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" />
                          {lang === "bn" ? "সরান" : "Remove"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <Link href="/products" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
                  <ArrowLeft className="w-4 h-4" />
                  {lang === "bn" ? "কেনাকাটা চালিয়ে যান" : "Continue shopping"}
                </Link>
              </div>

              <div className="enterprise-card p-6 h-fit sticky top-[calc(var(--navbar-offset)+1rem)]">
                <h2 className="font-bold text-heading mb-4">{lang === "bn" ? "অর্ডার সারাংশ" : "Order Summary"}</h2>

                {Number.isFinite(freeDeliveryMin) && freeDeliveryMin > 0 && (
                  cartSubtotal >= freeDeliveryMin ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mb-4">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      {lang === "bn" ? "আপনি ফ্রি ডেলিভারি পাচ্ছেন" : "You qualify for free delivery"}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 mb-4">
                      <Truck className="w-4 h-4 flex-shrink-0" />
                      {lang === "bn"
                        ? `আরও ${formatPrice(freeDeliveryMin - cartSubtotal)} যোগ করলে ফ্রি ডেলিভারি`
                        : `Add ${formatPrice(freeDeliveryMin - cartSubtotal)} more for free delivery`}
                    </p>
                  )
                )}

                {couponsEnabled && (
                  <>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input value={coupon} onChange={(e) => { setCoupon(e.target.value); if (couponError) setCouponError(null); }} placeholder={t("cart_coupon")} className="input pl-9 text-sm py-2" disabled={!!appliedCoupon} aria-invalid={!!couponError} />
                      </div>
                      <button type="button" onClick={applyCoupon} className="btn btn-outline btn-sm">{t("cart_apply")}</button>
                    </div>
                    {couponError && (
                      <p role="status" className="text-xs text-red-500 mb-3">{couponError}</p>
                    )}
                    {appliedCoupon && (
                      <p className="text-xs text-green-600 mb-3">{appliedCoupon.code} — {lang === "bn" ? "আপনি সাশ্রয়" : "You save"} {formatPrice(discount)}</p>
                    )}
                  </>
                )}

                <div className="space-y-2 text-sm border-t border-gray-100 dark:border-white/10 pt-4">
                  <div className="flex justify-between"><span className="text-muted">{t("cart_subtotal")}</span><span className="money">{formatPrice(cartSubtotal)}</span></div>
                  {comboSubtotal > 0 && <div className="flex justify-between"><span className="text-muted">{lang === "bn" ? "কম্বো" : "Combos"}</span><span className="money">{formatPrice(comboSubtotal)}</span></div>}
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span className="money">-{formatPrice(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted">{t("cart_delivery")}</span><span>{lang === "bn" ? "চেকআউটে" : "At checkout"}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-white/10">
                    <span>{t("cart_total")}</span><span className="money text-brand-600">{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                <button type="button" onClick={() => router.push(appliedCoupon ? `/checkout?coupon=${appliedCoupon.code}` : "/checkout")} className="btn btn-primary btn-md w-full mt-6 btn-ripple">
                  {lang === "bn" ? "চেকআউট" : "Checkout"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
