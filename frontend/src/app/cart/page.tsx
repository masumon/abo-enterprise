"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, AlertTriangle, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { formatPrice } from "@/lib/utils";
import PageHero from "@/components/ui/PageHero";
import EmptyState from "@/components/ui/EmptyState";
import { productsApi } from "@/lib/api";
import { validateCoupon, type AppliedCoupon } from "@/lib/coupons";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

export default function CartPage() {
  const { items, updateQuantity, removeItem, total, stockWarnings, setStockWarnings } = useCartStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const router = useRouter();
  const couponsEnabled = useFeatureFlag("feature_coupons", true);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validating, setValidating] = useState(false);

  const cartSubtotal = total();
  const discount = appliedCoupon?.discountAmount ?? 0;
  const cartTotal = cartSubtotal - discount;

  useEffect(() => {
    if (items.length === 0) return;
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
  }, [items.length, setStockWarnings, updateQuantity]);

  const applyCoupon = async () => {
    if (!couponsEnabled || !coupon.trim()) return;
    try {
      setAppliedCoupon(await validateCoupon(coupon, cartSubtotal));
    } catch { /* ignore */ }
  };

  return (
    <main>
      <PageHero
        pageKey="cart"
        title={lang === "bn" ? "শপিং কার্ট" : "Shopping Cart"}
        subtitle={lang === "bn" ? `${items.length}টি পণ্য` : `${items.length} items`}
        breadcrumbs={[{ label: lang === "bn" ? "কার্ট" : "Cart" }]}
        variant="light"
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-5xl">
          {items.length === 0 ? (
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
                      <h3 className="font-semibold text-heading truncate">{lang === "bn" ? item.name_bn : item.name_en}</h3>
                      <p className="text-brand-600 font-bold mt-1">{formatPrice(item.price)}</p>
                      <div className="flex items-center gap-3 mt-3">
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
                    <p className="font-bold text-heading">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}

                <Link href="/products" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
                  <ArrowLeft className="w-4 h-4" />
                  {lang === "bn" ? "কেনাকাটা চালিয়ে যান" : "Continue shopping"}
                </Link>
              </div>

              <div className="enterprise-card p-6 h-fit sticky top-[calc(var(--navbar-offset)+1rem)]">
                <h2 className="font-bold text-heading mb-4">{lang === "bn" ? "অর্ডার সারাংশ" : "Order Summary"}</h2>

                {couponsEnabled && (
                  <>
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t("cart_coupon")} className="input pl-9 text-sm py-2" disabled={!!appliedCoupon} />
                      </div>
                      <button type="button" onClick={applyCoupon} className="btn btn-outline btn-sm">{t("cart_apply")}</button>
                    </div>
                    {appliedCoupon && (
                      <p className="text-xs text-green-600 mb-3">{appliedCoupon.code} — {lang === "bn" ? "আপনি সাশ্রয়" : "You save"} {formatPrice(discount)}</p>
                    )}
                  </>
                )}

                <div className="space-y-2 text-sm border-t border-gray-100 dark:border-white/10 pt-4">
                  <div className="flex justify-between"><span className="text-muted">{t("cart_subtotal")}</span><span>{formatPrice(cartSubtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted">{t("cart_delivery")}</span><span>{lang === "bn" ? "চেকআউটে" : "At checkout"}</span></div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100 dark:border-white/10">
                    <span>{t("cart_total")}</span><span className="text-brand-600">{formatPrice(cartTotal)}</span>
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
