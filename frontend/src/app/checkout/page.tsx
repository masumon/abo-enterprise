"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShoppingBag, Tag, AlertCircle, ArrowLeft, Truck, Shield, ChevronRight, Copy, Check,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { cn, formatPrice } from "@/lib/utils";
import { ordersApi, productsApi, customerOtpApi, paymentsApi } from "@/lib/api";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_EN, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { mapPaymentMethods } from "@/lib/paymentDisplay";
import { BD_DISTRICTS } from "@/lib/bdDistricts";
import { buildOrderConfirmActions, calcDeliveryCharge } from "@/lib/checkoutHelpers";
import { validateCoupon, type AppliedCoupon } from "@/lib/coupons";
import PageHero from "@/components/ui/PageHero";

const schema = z.object({
  customer_name: z.string().min(2, "Name required (min 2 chars)"),
  customer_phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_EN),
  customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
  district: z.string().min(1, "Select district"),
  street_address: z.string().min(5, "Enter full street/area address"),
  payment_gateway: z.string().min(1, "Select payment method"),
  payment_trx_id: z.string().optional(),
  otp_code: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart, setStockWarnings } = useCartStore();
  const { lang } = useLanguageStore();
  const { methods: paymentMethods } = usePaymentMethods();
  const paymentOptions = useMemo(() => mapPaymentMethods(paymentMethods, lang), [paymentMethods, lang]);

  const { settings } = usePublicSettings([
    "delivery_charge_dhaka", "delivery_charge_outside", "delivery_charge_sylhet",
    "free_delivery_min_amount", "checkout_confirm_channel", "checkout_otp_required",
    "whatsapp_number", "contact_phone", "contact_email",
  ]);
  const couponsEnabled = useFeatureFlag("feature_coupons", true);

  const otpRequired = getSettingValue(settings, "checkout_otp_required") === "true";

  const [hydrated, setHydrated] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [copiedAcct, setCopiedAcct] = useState(false);

  const {
    register, handleSubmit, watch, setValue, formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_gateway: "bkash", district: "Sylhet" },
  });

  const selectedGateway = watch("payment_gateway");
  const selectedDistrict = watch("district");
  const selectedPhone = watch("customer_phone");
  const selectedPayment = paymentOptions.find((p) => p.gateway === selectedGateway) ?? paymentOptions[0];

  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((p) => p.gateway === selectedGateway)) {
      setValue("payment_gateway", paymentOptions[0].gateway);
    }
  }, [paymentOptions, selectedGateway, setValue]);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/products");
  }, [hydrated, items.length, router]);

  useEffect(() => {
    const coupon = new URLSearchParams(window.location.search).get("coupon")?.trim();
    if (coupon && couponsEnabled) {
      setCouponInput(coupon);
      validateCoupon(coupon, total()).then(setAppliedCoupon).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponsEnabled]);

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
  const discount = appliedCoupon?.discountAmount ?? 0;
  const afterDiscount = subtotal - discount;
  const deliveryCharge = calcDeliveryCharge(selectedDistrict || "Sylhet", afterDiscount, settings);
  const cartTotal = afterDiscount + deliveryCharge;

  const applyCoupon = async () => {
    if (!couponsEnabled) return;
    const code = couponInput.trim();
    if (!code) return;
    setCouponError(null);
    try {
      const result = await validateCoupon(code, subtotal);
      setAppliedCoupon(result);
    } catch {
      setCouponError(lang === "bn" ? "কুপন সঠিক নয়" : "Invalid coupon");
    }
  };

  const sendOtp = async () => {
    if (!BD_PHONE_REGEX.test(selectedPhone)) return;
    setOtpLoading(true);
    try {
      await customerOtpApi.send(selectedPhone);
      setOtpSent(true);
      setOtpVerified(false);
    } catch {
      setSubmitError(lang === "bn" ? "OTP পাঠানো যায়নি" : "Could not send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    if (!code || code.length < 4) return;
    setOtpLoading(true);
    try {
      await customerOtpApi.verify(selectedPhone, code);
      setOtpVerified(true);
    } catch {
      setOtpVerified(false);
      setSubmitError(lang === "bn" ? "OTP সঠিক নয়" : "Invalid OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const copyAccount = () => {
    if (selectedPayment?.detail) {
      navigator.clipboard.writeText(selectedPayment.detail);
      setCopiedAcct(true);
      setTimeout(() => setCopiedAcct(false), 2000);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (otpRequired && !otpVerified) {
      setSubmitError(lang === "bn" ? "ফোন ভেরিফাই করুন" : "Please verify your phone");
      return;
    }
    if (selectedPayment?.requiresTrxId && !data.payment_trx_id?.trim()) {
      setSubmitError(lang === "bn" ? "TrxID / রেফারেন্স নম্বর দিন" : "Enter TrxID / reference number");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const fullAddress = `${data.street_address}, ${data.district}, Bangladesh`;
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
        delivery_address: fullAddress,
        payment_method: data.payment_gateway,
        payment_number: data.payment_trx_id?.trim() || undefined,
        notes: data.notes,
        items: orderItems,
        subtotal,
        discount_amount: discount,
        coupon_code: appliedCoupon?.code,
        delivery_charge: deliveryCharge,
        total: cartTotal,
      });

      const orderData = orderRes.data.data as { order_id?: string; order_number?: string } | undefined;
      const orderNumber = orderData?.order_number ?? null;
      const orderId = orderData?.order_id;

      const tryGatewayRedirect = async (): Promise<boolean> => {
        if (!orderId) return false;
        const gw = data.payment_gateway;
        const canAuto =
          gw === "sslcommerz" ||
          (["bkash", "nagad"].includes(gw) && (!selectedPayment?.isManual || !selectedPayment?.requiresTrxId));
        if (!canAuto) return false;
        try {
          const pay =
            gw === "sslcommerz"
              ? await paymentsApi.initiateSslcommerz(orderId)
              : gw === "nagad"
                ? await paymentsApi.initiateNagad(orderId)
                : await paymentsApi.initiateBkash(orderId);
          if (pay.data.data?.payment_url) {
            clearCart();
            window.location.href = pay.data.data.payment_url;
            return true;
          }
        } catch { /* fall through to manual confirm */ }
        return false;
      };

      if (await tryGatewayRedirect()) return;

      const waItems = items.map((i) => ({
        name: lang === "bn" ? i.name_bn : i.name_en,
        price: i.price,
        qty: i.quantity,
      }));

      const actions = buildOrderConfirmActions({
        settings,
        lang,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerEmail: data.customer_email,
        deliveryAddress: data.street_address,
        district: data.district,
        items: waItems,
        total: cartTotal,
        paymentLabel: selectedPayment?.label ?? data.payment_gateway,
        trxId: data.payment_trx_id,
        orderNumber,
      });

      if (actions.openWhatsApp) window.open(actions.openWhatsApp, "_blank");
      else if (actions.mailto) window.location.href = actions.mailto;

      clearCart();
      router.push(
        `/order-success${orderNumber ? `?order=${orderNumber}&phone=${encodeURIComponent(data.customer_phone)}` : ""}`
      );
    } catch {
      setSubmitError(
        lang === "bn"
          ? "অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন।"
          : "Could not submit order. Please try again."
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

  const ctaLabel = lang === "bn" ? "অর্ডার নিশ্চিত করুন" : "Confirm Order";

  return (
    <div className="min-h-screen page-surface pb-24 lg:pb-8">
      <PageHero
        pageKey="checkout"
        title={lang === "bn" ? "অর্ডার করুন" : "Checkout"}
        subtitle={lang === "bn" ? "গেস্ট চেকআউট — দ্রুত ও নিরাপদ" : "Guest checkout — fast & secure"}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "কার্ট" : "Cart", href: "/cart" },
          { label: lang === "bn" ? "চেকআউট" : "Checkout" },
        ]}
        variant="light"
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "কার্টে ফিরুন" : "Back to Cart"}
        </Link>

        {stockIssue && (
          <div role="alert" className="mb-6 alert-warning">
            {lang === "bn" ? "কিছু পণ্যের স্টক সীমিত — কার্ট যাচাই করুন।" : "Limited stock — review your cart."}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {submitError && (
                <div role="alert" className="alert-error flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <section className="enterprise-card p-6">
                <h2 className="font-semibold text-heading mb-4">{lang === "bn" ? "আপনার তথ্য" : "Your Details"}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">{lang === "bn" ? "পুরো নাম *" : "Full Name *"}</label>
                    <input {...register("customer_name")} className={cn("input", errors.customer_name && "input-error")} />
                    {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{lang === "bn" ? "মোবাইল *" : "Mobile *"}</label>
                      <input {...register("customer_phone")} type="tel" className={cn("input", errors.customer_phone && "input-error")} placeholder="01XXXXXXXXX" />
                      {errors.customer_phone && <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">{lang === "bn" ? "ইমেইল" : "Email"}</label>
                      <input {...register("customer_email")} type="email" className="input" placeholder="your@email.com" />
                    </div>
                  </div>

                  {otpRequired && (
                    <div className="alert-info space-y-3">
                      <p className="text-sm font-medium text-heading">
                        {lang === "bn" ? "ফোন ভেরিফিকেশন" : "Phone Verification"}
                      </p>
                      <div className="flex gap-2">
                        <input {...register("otp_code")} className="input flex-1" placeholder="4-digit OTP" maxLength={4}
                          onChange={(e) => { register("otp_code").onChange(e); if (e.target.value.length === 4) verifyOtp(e.target.value); }} />
                        <button type="button" onClick={sendOtp} disabled={otpLoading || otpVerified} className="btn btn-outline btn-sm">
                          {otpVerified ? (lang === "bn" ? "✓" : "✓") : otpSent ? (lang === "bn" ? "আবার" : "Resend") : (lang === "bn" ? "OTP" : "OTP")}
                        </button>
                      </div>
                      {otpVerified && <p className="text-xs text-green-600 dark:text-green-400">{lang === "bn" ? "ভেরিফাই হয়েছে" : "Verified"}</p>}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{lang === "bn" ? "জেলা *" : "District *"}</label>
                      <select {...register("district")} className={cn("input", errors.district && "input-error")}>
                        {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">{lang === "bn" ? "ডেলিভারি চার্জ" : "Delivery"}</label>
                      <div className="input input-readonly flex items-center text-sm font-semibold">
                        {deliveryCharge === 0
                          ? (lang === "bn" ? "🎉 বিনামূল্যে" : "🎉 FREE")
                          : formatPrice(deliveryCharge)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{lang === "bn" ? "বিস্তারিত ঠিকানা *" : "Street Address *"}</label>
                    <textarea {...register("street_address")} rows={2} className={cn("input resize-none", errors.street_address && "input-error")}
                      placeholder={lang === "bn" ? "রোড, এলাকা, ইউনিয়ন..." : "Road, area, union..."} />
                    {errors.street_address && <p className="text-red-500 text-xs mt-1">{errors.street_address.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">{lang === "bn" ? "নোট" : "Notes"}</label>
                    <textarea {...register("notes")} rows={2} className="input resize-none" />
                  </div>
                </div>
              </section>

              <section className="enterprise-card p-6">
                <h2 className="font-semibold text-heading mb-4">{lang === "bn" ? "পেমেন্ট পদ্ধতি *" : "Payment Method *"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentOptions.map((opt) => (
                    <label key={opt.id} className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all enterprise-card-hover",
                      selectedGateway === opt.gateway ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                    )}>
                      <input type="radio" value={opt.gateway} {...register("payment_gateway")} className="sr-only" />
                      <span className="text-xl">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted mt-0.5 truncate">{opt.detail}</p>
                      </div>
                      {selectedGateway === opt.gateway && (
                        <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>

                {selectedPayment && selectedPayment.requiresTrxId && selectedPayment.gateway !== "cod" && (
                  <div className="mt-4 p-4 panel-muted space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        {lang === "bn" ? "এই নম্বরে Send Money করুন:" : "Send Money to:"}
                        <span className="ml-2 font-bold text-brand-700">{selectedPayment.detail}</span>
                      </p>
                      <button type="button" onClick={copyAccount} className="btn btn-ghost btn-sm">
                        {copiedAcct ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <div>
                      <label className="form-label">{lang === "bn" ? "TrxID / রেফারেন্স *" : "TrxID / Reference *"}</label>
                      <input {...register("payment_trx_id")} className="input" placeholder={lang === "bn" ? "পেমেন্ট TrxID" : "Payment TrxID"} />
                    </div>
                  </div>
                )}
              </section>

              <div className="flex items-center gap-6 text-xs text-muted">
                <div className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-500" />{lang === "bn" ? "নিরাপদ" : "Secure"}</div>
                <div className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-brand-500" />{lang === "bn" ? "দেশwide ডেলিভারি" : "Nationwide delivery"}</div>
              </div>

              <button type="submit" disabled={isSubmitting || stockIssue} className="btn btn-success btn-lg w-full hidden lg:flex">
                {isSubmitting ? (lang === "bn" ? "প্রক্রিয়া..." : "Processing...") : ctaLabel}
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-[calc(var(--navbar-offset)+1rem)]">
              <section className="enterprise-card p-6">
                <h2 className="font-semibold text-heading mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-500" />
                  {lang === "bn" ? "সারসংক্ষেপ" : "Summary"}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl bg-brand-50 overflow-hidden flex-shrink-0">
                        {item.image_url ? <Image src={item.image_url} alt="" width={56} height={56} className="object-cover w-full h-full" /> : <ShoppingBag className="w-6 h-6 text-brand-300 m-auto mt-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lang === "bn" ? item.name_bn : item.name_en}</p>
                        <p className="text-xs text-muted">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  {couponsEnabled && (
                    <>
                      {!appliedCoupon ? (
                        <div className="flex gap-2 mb-3">
                          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder={lang === "bn" ? "কুপন" : "Coupon"} className="input flex-1 text-sm py-2" />
                          <button type="button" onClick={applyCoupon} className="btn btn-outline btn-sm"><Tag className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-between text-green-600 text-sm mb-2">
                          <span>{appliedCoupon.code}</span>
                          <button type="button" onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} className="text-xs text-gray-400">✕</button>
                        </div>
                      )}
                      {couponError && <p className="text-red-500 text-xs">{couponError}</p>}
                    </>
                  )}
                  <div className="flex justify-between"><span>{lang === "bn" ? "সাবটোটাল" : "Subtotal"}</span><span>{formatPrice(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>{lang === "bn" ? "ছাড়" : "Discount"}</span><span>−{formatPrice(discount)}</span></div>}
                  <div className="flex justify-between"><span>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span><span>{deliveryCharge === 0 ? (lang === "bn" ? "ফ্রি" : "FREE") : formatPrice(deliveryCharge)}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                    <span>{lang === "bn" ? "মোট" : "Total"}</span>
                    <span className="text-green-600">{formatPrice(cartTotal)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky-cta-bar px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex-1"><p className="text-xs text-muted">{lang === "bn" ? "মোট" : "Total"}</p><p className="text-lg font-bold text-success-600">{formatPrice(cartTotal)}</p></div>
          <button type="submit" form="checkout-form" disabled={isSubmitting || stockIssue} className="btn btn-success btn-md min-w-[9rem]">
            {isSubmitting ? "..." : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
