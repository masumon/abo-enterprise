"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { productsApi } from "@/lib/api";
import { useFocusTrap } from "@/lib/useFocusTrap";

const COUPONS: Record<string, number> = { ABO10: 0.1, WELCOME: 0.05 };

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, total, stockWarnings, setStockWarnings } = useCartStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const router = useRouter();
  const trapRef = useFocusTrap(isOpen);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const cartSubtotal = total();
  const discountRate = appliedCoupon ? COUPONS[appliedCoupon] ?? 0 : 0;
  const discount = Math.round(cartSubtotal * discountRate);
  const delivery = 0;
  const tax = 0;
  const cartTotal = cartSubtotal - discount + delivery + tax;

  useEffect(() => {
    if (!isOpen || items.length === 0) return;
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
  }, [isOpen, items.length, setStockWarnings, updateQuantity]);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (COUPONS[code]) setAppliedCoupon(code);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        ref={trapRef}
        aria-label={lang === "bn" ? "শপিং কার্ট" : "Shopping cart"}
        className="fixed right-0 top-0 bottom-0 z-[60] w-full max-w-md flex flex-col animate-slide-right pb-safe bg-white/97 dark:bg-[#0f1a2e]/97 backdrop-blur-xl shadow-[-8px_0_40px_rgba(30,91,168,0.12)] dark:shadow-[-8px_0_40px_rgba(0,0,0,0.35)]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100/80 gradient-brand">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">
              {lang === "bn" ? "আমার কার্ট" : "My Cart"}
            </h2>
            <p className="text-white/60 text-xs mt-0.5">
              {items.length} {lang === "bn" ? "টি পণ্য" : "items"}
            </p>
          </div>
          <button type="button" onClick={closeCart} className="w-9 h-9 text-white hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors" aria-label="Close cart">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" aria-live="polite">
          {validating && (
            <p className="text-xs text-brand-600 dark:text-brand-300 text-center">{lang === "bn" ? "স্টক যাচাই হচ্ছে..." : "Checking stock..."}</p>
          )}
          {stockWarnings.length > 0 && (
            <div role="alert" className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs rounded-xl px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{lang === "bn" ? "কিছু পণ্যের স্টক সীমিত — পরিমাণ আপডেট হয়েছে।" : "Some items have limited stock — quantities adjusted."}</span>
            </div>
          )}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-brand-200" aria-hidden />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-semibold mb-1">{lang === "bn" ? "কার্ট খালি আছে" : "Your cart is empty"}</p>
              <button type="button" onClick={closeCart} className="btn btn-brand btn-sm mt-4">{lang === "bn" ? "কেনাকাটা শুরু করুন" : "Start Shopping"}</button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product_id} className={cn("flex gap-4 p-3.5 rounded-2xl border transition-colors bg-white/80 dark:bg-white/5", stockWarnings.includes(item.product_id) ? "border-amber-200 dark:border-amber-800" : "border-gray-100 dark:border-white/10 hover:border-brand-100 dark:hover:border-brand-800")}>
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name_en} width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <ShoppingBag className="w-7 h-7 text-brand-300" aria-hidden />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{lang === "bn" ? item.name_bn : item.name_en}</p>
                  <p className="text-accent-500 font-bold mt-0.5 text-sm">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-7 h-7 bg-gray-100 dark:bg-white/10 hover:bg-brand-50 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center" aria-label="Decrease quantity">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-700 dark:text-gray-200">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="w-7 h-7 bg-gray-100 dark:bg-white/10 hover:bg-brand-50 dark:hover:bg-white/15 border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center" aria-label="Increase quantity">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => removeItem(item.product_id)} className="ml-auto w-7 h-7 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg flex items-center justify-center" aria-label="Remove item">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-5 border-t border-gray-100 dark:border-white/10 bg-[rgba(248,250,255,0.95)] dark:bg-[#0a1628]/95">
            <div className="flex gap-2 mb-4">
              <label htmlFor="cart-coupon" className="sr-only">{t("cart_coupon")}</label>
              <input id="cart-coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder={t("cart_coupon")} className="input flex-1 text-sm py-2" disabled={!!appliedCoupon} />
              {appliedCoupon ? (
                <button type="button" onClick={removeCoupon} className="btn btn-outline btn-sm">{lang === "bn" ? "সরান" : "Remove"}</button>
              ) : (
                <button type="button" onClick={applyCoupon} className="btn btn-outline btn-sm">
                  <Tag className="w-4 h-4" aria-hidden />
                  {t("cart_apply")}
                </button>
              )}
            </div>
            {appliedCoupon && (
              <p className="text-xs text-green-600 mb-2">{appliedCoupon} {lang === "bn" ? "প্রয়োগ হয়েছে" : "applied"} — {lang === "bn" ? "আপনি সাশ্রয় করছেন" : "You save"} {formatPrice(discount)}</p>
            )}
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">{t("cart_subtotal")}</span><span>{formatPrice(cartSubtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600 dark:text-green-400 font-medium"><span>{lang === "bn" ? "ছাড়" : "Discount"}</span><span>-{formatPrice(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-muted">{t("cart_delivery")}</span><span className="text-green-600 font-medium">{lang === "bn" ? "ফ্রি" : "FREE"}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/10">
                <span className="font-bold text-heading">{t("cart_total")}</span>
                <span className="text-2xl font-bold text-accent-500">{formatPrice(cartTotal)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { closeCart(); router.push(appliedCoupon ? `/checkout?coupon=${appliedCoupon}` : "/checkout"); }}
              disabled={stockWarnings.length > 0 && validating}
              className="btn btn-primary btn-lg w-full btn-ripple shadow-lg shadow-accent-500/25"
            >
              {lang === "bn" ? "চেকআউট করুন" : "Proceed to Checkout"}
              <ArrowRight className="w-5 h-5" aria-hidden />
            </button>
            <p className="text-center text-xs text-muted mt-2">{lang === "bn" ? "অ্যাকাউন্ট ছাড়াই অর্ডার করুন" : "Guest checkout — no account needed"}</p>
          </div>
        )}
      </aside>
    </>
  );
}
