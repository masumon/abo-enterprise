"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShoppingBag,
  Tag,
  AlertCircle,
  ArrowLeft,
  Truck,
  Shield,
  ChevronRight,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { formatPrice, generateWhatsAppOrderMessage, WHATSAPP_NUMBER } from "@/lib/utils";
import { ordersApi, productsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import type { PaymentMethod } from "@/types";
import PageHero from "@/components/ui/PageHero";

const COUPONS: Record<string, number> = { ABO10: 0.1, WELCOME: 0.05 };

const schema = z.object({
  customer_name: z.string().min(2, "নাম দিন (কমপক্ষে ২ অক্ষর)"),
  customer_phone: z
    .string()
    .regex(/^0[13-9]\d{8}$/, "সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)"),
  customer_email: z.string().email("সঠিক ইমেইল দিন").optional().or(z.literal("")),
  delivery_address: z.string().min(10, "সম্পূর্ণ ঠিকানা দিন"),
  payment_method: z.enum(["bkash", "rocket", "bank", "cod"] as const),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DEFAULT_PAYMENT_PHONE = "01825007977";
const DEFAULT_BANK_DETAIL = "A/C: 1075869070001";

function buildPaymentOptions(settings: Record<string, string>, lang: "en" | "bn") {
  const phone =
    getSettingValue(settings, "contact_phone") ||
    getSettingValue(settings, "business_phone").replace(/\D/g, "").slice(-11) ||
    DEFAULT_PAYMENT_PHONE;
  const bkash =
    getSettingValue(settings, "bkash_account") || phone;
  const rocket =
    getSettingValue(settings, "rocket_account") ||
    getSettingValue(settings, "nagad_account") ||
    phone;
  const bank =
    getSettingValue(settings, "bank_account") || DEFAULT_BANK_DETAIL;

  return [
    { value: "bkash" as PaymentMethod, label: "bKash", detail: bkash, icon: "💳" },
    { value: "rocket" as PaymentMethod, label: "Rocket", detail: rocket, icon: "🚀" },
    { value: "bank" as PaymentMethod, label: "BRAC Bank", detail: bank, icon: "🏦" },
    {
      value: "cod" as PaymentMethod,
      label: "Cash on Delivery",
      detail: lang === "bn" ? "ডেলিভারির সময়" : "On delivery",
      icon: "💵",
    },
  ];
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart, setStockWarnings } = useCartStore();
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings([
    "bkash_account",
    "nagad_account",
    "rocket_account",
    "contact_phone",
    "business_phone",
    "bank_account",
  ]);
  const paymentOptions = buildPaymentOptions(settings, lang);

  const [hydrated, setHydrated] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_method: "bkash" },
  });

  const selectedPayment = watch("payment_method");

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/products");
    }
  }, [hydrated, items.length, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const coupon = params.get("coupon")?.trim().toUpperCase();
    if (coupon && COUPONS[coupon]) {
      setAppliedCoupon(coupon);
      setCouponInput(coupon);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    productsApi.validateStock(items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })))
      .then((r) => {
        const issues = (r.data.data?.items ?? []).filter((i) => i.error);
        setStockIssue(issues.length > 0);
        setStockWarnings(issues.map((i) => i.product_id));
      })
      .catch(() => {});
  }, [hydrated, items, setStockWarnings]);

  const subtotal = total();
  const discountRate = appliedCoupon ? (COUPONS[appliedCoupon] ?? 0) : 0;
  const discount = Math.round(subtotal * discountRate);
  const cartTotal = subtotal - discount;

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (COUPONS[code]) {
      setAppliedCoupon(code);
      setCouponError(null);
    } else {
      setCouponError(lang === "bn" ? "কুপন কোড সঠিক নয়" : "Invalid coupon code");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const orderItems = items.map((i) => ({
        product_id: i.product_id,
        product_name: i.name_en,
        product_price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
      }));

      const orderRes = await ordersApi.create({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || undefined,
        delivery_address: data.delivery_address,
        payment_method: data.payment_method,
        notes: data.notes,
        items: orderItems,
        subtotal,
        discount_amount: discount,
        coupon_code: appliedCoupon ?? undefined,
        delivery_charge: 0,
        total: cartTotal,
      });

      const orderNumber =
        (orderRes.data.data as { order_number?: string } | undefined)?.order_number ?? null;

      const waItems = items.map((i) => ({
        name: lang === "bn" ? i.name_bn : i.name_en,
        price: i.price,
        qty: i.quantity,
      }));

      const paymentLabel =
        paymentOptions.find((p) => p.value === data.payment_method)?.label ?? data.payment_method;

      const msg = generateWhatsAppOrderMessage(
        data.customer_name,
        data.customer_phone,
        data.delivery_address,
        waItems,
        cartTotal,
        paymentLabel
      );

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

      clearCart();
      router.push(`/order-success${orderNumber ? `?order=${orderNumber}` : ""}`);
    } catch {
      setSubmitError(
        lang === "bn"
          ? "অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন বা WhatsApp-এ যোগাযোগ করুন।"
          : "Could not submit order. Please try again or contact us on WhatsApp."
      );
      setIsSubmitting(false);
    }
  };

  if (!hydrated || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-surface pb-24 lg:pb-8">
      <PageHero
        title={lang === "bn" ? "অর্ডার করুন" : "Checkout"}
        subtitle={
          lang === "bn"
            ? "গেস্ট চেকআউট — অ্যাকাউন্ট ছাড়াই অর্ডার করুন"
            : "Guest checkout — order without creating an account"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "কার্ট" : "Cart", href: "/cart" },
          { label: lang === "bn" ? "চেকআউট" : "Checkout" },
        ]}
        variant="light"
      />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand-600 dark:hover:text-brand-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "কার্টে ফিরুন" : "Back to Cart"}
        </Link>

        {stockIssue && (
          <div role="alert" className="mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {lang === "bn"
              ? "কিছু পণ্যের স্টক সীমিত। কার্টে ফিরে পরিমাণ যাচাই করুন।"
              : "Some items have limited stock. Please review quantities in your cart."}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-3">
            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-xl px-4 py-3"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Customer Info */}
              <section className="surface-card rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-heading mb-4">
                  {lang === "bn" ? "আপনার তথ্য" : "Customer Information"}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {lang === "bn" ? "পুরো নাম *" : "Full Name *"}
                    </label>
                    <input
                      {...register("customer_name")}
                      className={cn("input", errors.customer_name && "input-error")}
                      placeholder={lang === "bn" ? "আপনার পুরো নাম" : "Your full name"}
                    />
                    {errors.customer_name && (
                      <p role="alert" className="text-red-500 text-xs mt-1">
                        {errors.customer_name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {lang === "bn" ? "মোবাইল নম্বর *" : "Mobile Number *"}
                      </label>
                      <input
                        {...register("customer_phone")}
                        type="tel"
                        className={cn("input", errors.customer_phone && "input-error")}
                        placeholder="01XXXXXXXXX"
                      />
                      {errors.customer_phone && (
                        <p role="alert" className="text-red-500 text-xs mt-1">
                          {errors.customer_phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {lang === "bn" ? "ইমেইল (ঐচ্ছিক)" : "Email (optional)"}
                      </label>
                      <input
                        {...register("customer_email")}
                        type="email"
                        className={cn("input", errors.customer_email && "input-error")}
                        placeholder="your@email.com"
                      />
                      {errors.customer_email && (
                        <p role="alert" className="text-red-500 text-xs mt-1">
                          {errors.customer_email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {lang === "bn" ? "ডেলিভারি ঠিকানা *" : "Delivery Address *"}
                    </label>
                    <textarea
                      {...register("delivery_address")}
                      rows={3}
                      className={cn("input resize-none", errors.delivery_address && "input-error")}
                      placeholder={
                        lang === "bn"
                          ? "রোড, এলাকা, জেলা — বিস্তারিত ঠিকানা"
                          : "Street, Area, District — detailed address"
                      }
                    />
                    {errors.delivery_address && (
                      <p role="alert" className="text-red-500 text-xs mt-1">
                        {errors.delivery_address.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {lang === "bn" ? "বিশেষ নির্দেশনা (ঐচ্ছিক)" : "Special Instructions (optional)"}
                    </label>
                    <textarea
                      {...register("notes")}
                      rows={2}
                      className="input resize-none"
                      placeholder={
                        lang === "bn"
                          ? "কোনো বিশেষ নির্দেশনা থাকলে লিখুন"
                          : "Any special notes for delivery"
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Payment Method */}
              <section className="surface-card rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-heading mb-4">
                  {lang === "bn" ? "পেমেন্ট পদ্ধতি *" : "Payment Method *"}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {paymentOptions.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        selectedPayment === opt.value
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30"
                          : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/5"
                      )}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        {...register("payment_method")}
                        className="sr-only"
                      />
                      <span className="text-xl leading-none mt-0.5">{opt.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-heading">{opt.label}</p>
                        <p className="text-xs text-muted mt-0.5">{opt.detail}</p>
                      </div>
                      {selectedPayment === opt.value && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </section>

              {/* Trust badges */}
              <div className="flex items-center gap-6 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-green-500" />
                  {lang === "bn" ? "নিরাপদ অর্ডার" : "Secure Order"}
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-brand-500" />
                  {lang === "bn" ? "বিনামূল্যে ডেলিভারি" : "Free Delivery"}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || stockIssue}
                className="btn btn-primary btn-lg w-full hidden lg:flex"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {lang === "bn" ? "প্রক্রিয়া হচ্ছে..." : "Processing..."}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {lang === "bn" ? "WhatsApp-এ অর্ডার করুন" : "Order via WhatsApp"}
                    <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-[calc(var(--navbar-offset)+1rem)] space-y-4">
              <section className="surface-card rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-heading mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-500" />
                  {lang === "bn" ? "অর্ডার সারসংক্ষেপ" : "Order Summary"}
                  <span className="ml-auto text-xs text-gray-400 font-normal">
                    {items.length} {lang === "bn" ? "টি পণ্য" : "items"}
                  </span>
                </h2>

                <div className="space-y-3 divide-y divide-gray-50">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex gap-3 pt-3 first:pt-0">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name_en}
                            width={56}
                            height={56}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-brand-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {lang === "bn" ? item.name_bn : item.name_en}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-heading whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Coupon */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <Tag className="w-3.5 h-3.5" />
                        <span className="font-medium">{appliedCoupon}</span>
                        <span className="text-green-600">
                          ({Math.round(discountRate * 100)}% {lang === "bn" ? "ছাড়" : "off"})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                        placeholder={lang === "bn" ? "কুপন কোড" : "Coupon code"}
                        className="input flex-1 text-sm py-2"
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        className="btn btn-outline btn-sm px-3"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-red-500 text-xs mt-1">{couponError}</p>
                  )}
                </div>

                {/* Totals */}
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>{lang === "bn" ? "সাবটোটাল" : "Subtotal"}</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-900/20 -mx-2 px-2 py-1 rounded-lg">
                      <span>{lang === "bn" ? "🎉 আপনি সাশ্রয় করছেন" : "🎉 You save"}</span>
                      <span>−{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
                    <span className="text-green-600 font-medium">
                      {lang === "bn" ? "বিনামূল্যে" : "FREE"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-white/10 font-bold text-base">
                    <span className="text-heading">{lang === "bn" ? "মোট" : "Total"}</span>
                    <span className="text-xl text-accent-500">{formatPrice(cartTotal)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-mobile-nav left-0 right-0 z-40 lg:hidden border-t border-gray-100 dark:border-white/10 bg-white/95 dark:bg-[#0f1a2e]/95 backdrop-blur-xl px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted">{lang === "bn" ? "মোট" : "Total"}</p>
            <p className="text-lg font-bold text-accent-500">{formatPrice(cartTotal)}</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting || stockIssue}
            className="btn btn-primary btn-md flex-shrink-0 min-w-[9rem]"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {lang === "bn" ? "প্রক্রিয়া..." : "Processing..."}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {lang === "bn" ? "অর্ডার করুন" : "Place Order"}
                <ChevronRight className="w-5 h-5" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
