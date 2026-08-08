"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShoppingBag, Tag, AlertCircle, ArrowLeft, Truck, Shield, ChevronRight, Copy, Check,
  Building2, ChevronDown,
} from "lucide-react";
import { apiErrorMessage } from "@/lib/apiError";
import { trackEvent } from "@/components/analytics/GoogleAnalytics";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { cn, formatPrice } from "@/lib/utils";
import { ordersApi, productsApi, customerOtpApi, paymentsApi, deliveryZonesApi, type DeliveryZone } from "@/lib/api";
import { BD_PHONE_REGEX, BD_PHONE_ERROR_EN, BD_PHONE_ERROR_BN } from "@/lib/phone";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useCustomerStore } from "@/store/customer";
import { useCustomerProfileStore } from "@/store/customerProfile";
import { mapPaymentMethods } from "@/lib/paymentDisplay";
import { useDistrictUpazila, BD_DISTRICTS } from "@/hooks/useDistrictUpazila";
import { calcDeliveryCharge, calcAdvanceCharge } from "@/lib/checkoutHelpers";
import { validateCoupon, type AppliedCoupon } from "@/lib/coupons";
import { isOffline } from "@/lib/networkStatus";
import { saveOrderSnapshot } from "@/lib/orderSnapshot";
import CountrySelector from "@/components/ui/CountrySelector";
import PageHero from "@/components/ui/PageHero";

const schema = z.object({
  customer_name: z.string().min(2, "Name required (min 2 chars)"),
  customer_phone: z.string().regex(BD_PHONE_REGEX, BD_PHONE_ERROR_EN),
  customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
  district: z.string().min(1, "Select district"),
  upazila: z.string().optional(),
  street_address: z.string().min(5, "Enter full street/area address"),
  payment_gateway: z.string().min(1, "Select payment method"),
  payment_trx_id: z.string().optional(),
  otp_code: z.string().optional(),
  // Institutional invoice identity (manual_sql/0009). All optional: a personal
  // order sends none of them and behaves exactly as before.
  company_name: z.string().optional(),
  company_bin: z.string().optional(),
  company_tin: z.string().optional(),
  po_number: z.string().optional(),
  billing_address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart, setStockWarnings } = useCartStore();
  const { lang } = useLanguageStore();
  const { methods: paymentMethods } = usePaymentMethods();
  /*
   * Screen 11 — payment methods are ordered by how customers actually pay, not
   * by margin: adding friction to the majority flow to nudge a minority is a
   * poor trade one step before revenue. Cash on delivery leads and is marked
   * Popular. Ordering is presentational; nothing about which methods are
   * enabled, or their settings, changes here.
   */
  const paymentOptions = useMemo(() => {
    const mapped = mapPaymentMethods(paymentMethods, lang);
    const isCod = (g: string) => g === "cod" || g === "cash_on_delivery";
    return [...mapped].sort((a, b) => Number(isCod(b.gateway)) - Number(isCod(a.gateway)));
  }, [paymentMethods, lang]);

  /*
   * What pressing this option will do. A customer who knows a redirect is
   * coming does not read the gateway's page as a failure — and the ones that
   * stay on site should say so just as plainly.
   */
  const paymentConsequence = (opt: { gateway: string; label: string; isManual: boolean }) => {
    if (opt.gateway === "cod" || opt.gateway === "cash_on_delivery") {
      return lang === "bn"
        ? "রাইডারকে দিন। এখন কিছু দিতে হবে না।"
        : "Pay the rider. Nothing to pay now.";
    }
    if (opt.isManual) {
      return lang === "bn"
        ? "Send Money করে TrxID দিন — এই পাতাতেই।"
        : "Send Money, then enter the TrxID — you stay on this page.";
    }
    return lang === "bn"
      ? `নিশ্চিত করতে ${opt.label}-এ যাবে`
      : `Continues on ${opt.label} to confirm`;
  };

  const { settings } = usePublicSettings([
    "delivery_charge_dhaka", "delivery_charge_outside", "delivery_charge_sylhet",
    "free_delivery_min_amount", "checkout_otp_required",
    "whatsapp_number", "contact_phone", "contact_email",
  ]);
  const couponsEnabled = useFeatureFlag("feature_coupons", true);
  /*
   * Screen 11c — one design, two configurations. With guest checkout allowed
   * (the default), signing in is offered as a convenience and never blocks the
   * order. With the flag off, the same card becomes the gate. The setting has
   * existed in the admin panel all along; checkout simply never read it, so
   * turning it off changed nothing.
   */
  const guestAllowed = useFeatureFlag("feature_guest_checkout", true);
  const customerSession = useCustomerStore((st) => st.session);
  const signedIn = Boolean(customerSession?.token);
  const signInRequired = !guestAllowed && !signedIn;
  const savedAddresses = useCustomerProfileStore((s) => s.addresses);
  const savedEmail = useCustomerProfileStore((s) => s.email);

  const otpRequired = getSettingValue(settings, "checkout_otp_required") === "true";

  const [hydrated, setHydrated] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stockIssue, setStockIssue] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  // M8 — same 30s resend cooldown as CustomerOtpForm.tsx; this page has its
  // own inline OTP send/verify instead of reusing that component, so the
  // cooldown has to be duplicated here rather than fixed in one place.
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [copiedAcct, setCopiedAcct] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("BD");
  // Admin-defined delivery zones (optional). Empty → calcDeliveryCharge falls
  // back to the legacy settings-based 3-tier charge, so checkout never breaks.
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  // Set before clearCart() so the empty-cart redirect below can't hijack the
  // navigation to /order-success (a race customers hit on slower devices).
  const orderPlacedRef = useRef(false);

  const {
    register, handleSubmit, watch, setValue, getValues, formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Left blank on purpose: the effect below selects the first available
    // method, which is now cash on delivery. Hardcoding "bkash" here listed COD
    // first and then pre-selected something else — the list said one thing and
    // the radio said another.
    defaultValues: { payment_gateway: "", district: "Sylhet" },
  });

  const selectedGateway = watch("payment_gateway");
  const selectedDistrict = watch("district");
  const selectedUpazila = watch("upazila");
  const selectedPhone = watch("customer_phone");
  const selectedEmail = watch("customer_email");
  const selectedPayment = paymentOptions.find((p) => p.gateway === selectedGateway) ?? paymentOptions[0];
  const { upazilaOptions } = useDistrictUpazila(selectedDistrict, selectedUpazila, (v) =>
    setValue("upazila", v)
  );

  useEffect(() => {
    let active = true;
    deliveryZonesApi.list()
      .then((r) => { if (active) setDeliveryZones(r.data.data ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((p) => p.gateway === selectedGateway)) {
      setValue("payment_gateway", paymentOptions[0].gateway);
    }
  }, [paymentOptions, selectedGateway, setValue]);

  // M5 — a signed-in returning customer shouldn't retype what we already
  // have. Only fills fields that are still empty, so it never overwrites
  // something mid-typed; district/upazila are left alone since the saved
  // address is free text and mapping it onto those enums would be a guess.
  useEffect(() => {
    if (!signedIn || !customerSession) return;
    if (!getValues("customer_name")) setValue("customer_name", customerSession.name);
    if (!getValues("customer_phone")) setValue("customer_phone", customerSession.phone);
    if (savedEmail && !getValues("customer_email")) setValue("customer_email", savedEmail);
    const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    if (defaultAddr && !getValues("street_address")) setValue("street_address", defaultAddr.address);
  }, [signedIn, customerSession, savedAddresses, savedEmail, setValue, getValues]);

  // GA4 funnel: fire once when checkout opens.
  useEffect(() => {
    trackEvent("begin_checkout", { currency: "BDT" });
  }, []);

  useEffect(() => {
    useCartStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (otpResendIn <= 0) return;
    const t = setTimeout(() => setOtpResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendIn]);

  useEffect(() => {
    if (hydrated && items.length === 0 && !orderPlacedRef.current) router.replace("/products");
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
  const maxProductCharge = items.reduce((m, i) => Math.max(m, Number(i.delivery_charge) || 0), 0);
  const deliveryCharge = calcDeliveryCharge(selectedDistrict || "Sylhet", afterDiscount, settings, maxProductCharge, { upazila: selectedUpazila, zones: deliveryZones });
  const advanceCharge = calcAdvanceCharge(items, settings);
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
    if (otpResendIn > 0) return;
    if (!BD_PHONE_REGEX.test(selectedPhone)) return;
    if (!selectedEmail) {
      setSubmitError(lang === "bn" ? "OTP পেতে ইমেইল দিন" : "Enter an email to receive the OTP");
      return;
    }
    setOtpLoading(true);
    try {
      await customerOtpApi.send(selectedPhone, selectedEmail);
      setOtpSent(true);
      setOtpVerified(false);
      setOtpResendIn(30);
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
    if (isOffline()) {
      setSubmitError(lang === "bn" ? "অফলাইনে অর্ডার করা যায় না — ইন্টারনেট সংযোগ দিন" : "Cannot order offline — please connect to the internet");
      return;
    }
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
      const fullAddress = `${data.street_address}, ${data.upazila ? `${data.upazila}, ` : ""}${data.district}, Bangladesh`;
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
        // Sent only when the buyer opened the company section and filled it in;
        // blanks stay undefined so a personal order's payload is unchanged.
        company_name: data.company_name?.trim() || undefined,
        company_bin: data.company_bin?.trim() || undefined,
        company_tin: data.company_tin?.trim() || undefined,
        po_number: data.po_number?.trim() || undefined,
        billing_address: data.billing_address?.trim() || undefined,
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

      // Snapshot for the success page — renders the invoice summary even if
      // the invoice API is slow or unreachable (PWA / mobile networks)
      if (orderNumber) {
        saveOrderSnapshot({
          kind: "order",
          reference: orderNumber,
          order_number: orderNumber,
          phone: data.customer_phone,
          customer_name: data.customer_name,
          payment_method: data.payment_gateway,
          items: orderItems.map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.product_price,
            subtotal: i.subtotal,
          })),
          subtotal,
          delivery_charge: deliveryCharge,
          total: cartTotal,
          created_at: new Date().toISOString(),
        });
      }

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
            orderPlacedRef.current = true;
            clearCart();
            window.location.href = pay.data.data.payment_url;
            return true;
          }
        } catch { /* fall through to manual confirm */ }
        return false;
      };

      if (await tryGatewayRedirect()) return;

      orderPlacedRef.current = true;
      clearCart();
      router.push(
        `/order-success${orderNumber ? `?order=${orderNumber}&phone=${encodeURIComponent(data.customer_phone)}&method=${selectedGateway}` : ""}`
      );
    } catch (err) {
      setSubmitError(
        apiErrorMessage(
          err,
          lang === "bn"
            ? "অর্ডার জমা দেওয়া যায়নি। আবার চেষ্টা করুন।"
            : "Could not submit order. Please try again."
        )
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

  /*
   * Where the customer stands. Derived from the fields they have already
   * filled — the form is not gated, so this reports progress rather than
   * controlling it.
   */
  const deliveryValues = watch(["customer_name", "customer_phone", "district", "street_address"]);
  const deliveryStepDone = deliveryValues.every((v) => (v ?? "").toString().trim().length > 1);
  const paymentStepDone = deliveryStepDone && Boolean(selectedGateway) && (!otpRequired || otpVerified);

  /*
   * The button states its own outcome. The OTP gate is a runtime setting, so a
   * fixed label is guaranteed to be wrong in one configuration or the other:
   * with the gate on, pressing this sends a code rather than placing anything.
   */
  const ctaLabel = (() => {
    if (otpRequired && !otpVerified) {
      return lang === "bn" ? "কোড পাঠান" : "Send code";
    }
    const gw = paymentOptions.find((p) => p.gateway === selectedGateway);
    if (gw && !gw.isManual && gw.gateway !== "cod" && gw.gateway !== "cash_on_delivery") {
      return lang === "bn" ? `${gw.label}-এ যান` : `Continue to ${gw.label}`;
    }
    return lang === "bn" ? "অর্ডার নিশ্চিত করুন" : "Place order";
  })();

  return (
    <div className="min-h-screen page-surface pb-mobile-float lg:pb-8">
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
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          {lang === "bn" ? "কার্টে ফিরুন" : "Back to Cart"}
        </Link>

        {/*
          Screen 11 — Delivery → Payment → Confirm. The form stays one page and
          one submit; this reports where the customer stands rather than gating
          the fields, so nothing they have typed can be trapped behind a step.
          A checkout that hides its remaining length is a checkout people leave.
        */}
        <ol className="flex gap-2 mb-6" aria-label={lang === "bn" ? "চেকআউটের ধাপ" : "Checkout steps"}>
          {[
            { key: "delivery", label: { en: "Delivery", bn: "ঠিকানা" }, done: deliveryStepDone },
            { key: "payment", label: { en: "Payment", bn: "পেমেন্ট" }, done: paymentStepDone },
            { key: "confirm", label: { en: "Confirm", bn: "নিশ্চিত" }, done: false },
          ].map((step, i, all) => {
            const active = !step.done && all.slice(0, i).every((p) => p.done);
            return (
              <li key={step.key} className="flex-1 grid gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "h-[3px] rounded-full",
                    step.done ? "bg-green-600" : active ? "bg-brand-600" : "bg-gray-200 dark:bg-white/10"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] text-center",
                    step.done ? "text-green-700 dark:text-green-400" : active ? "font-bold text-heading" : "text-muted"
                  )}
                >
                  {lang === "bn" ? step.label.bn : step.label.en}
                </span>
              </li>
            );
          })}
        </ol>

        {!signedIn && (
          <div className={cn("mb-6", signInRequired ? "alert-warning" : "alert-info")} role={signInRequired ? "alert" : undefined}>
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 min-w-[14rem] text-sm">
                {signInRequired
                  ? (lang === "bn"
                      ? "অর্ডার করতে সাইন ইন করুন। ফোন ও ইমেইল দিন — কোডটি ইমেইলে যাবে।"
                      : "Sign in to place this order. Your phone and email — the code arrives by email.")
                  : (lang === "bn"
                      ? "সাইন ইন করলে পরের বার ঠিকানা নিজেই বসবে আর অর্ডার ট্র্যাক করা যাবে। না করলেও অর্ডার করতে পারবেন।"
                      : "Sign in and your address fills itself next time, and you can track the order. You can also order without it.")}
              </p>
              <div className="flex gap-2">
                <Link href="/login?redirect=/checkout" className={cn("btn btn-sm", signInRequired ? "btn-primary" : "btn-outline")}>
                  {lang === "bn" ? "সাইন ইন" : "Sign in"}
                </Link>
                {!signInRequired && guestAllowed && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => document.getElementById("checkout-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {lang === "bn" ? "অতিথি হিসেবে চালিয়ে যান" : "Continue as guest"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

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
                    <label className="form-label" htmlFor="customer-name">{lang === "bn" ? "পুরো নাম *" : "Full Name *"}</label>
                    <input id="customer-name" {...register("customer_name")} className={cn("input", errors.customer_name && "input-error")} />
                    {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label" htmlFor="customer-phone">{lang === "bn" ? "মোবাইল *" : "Mobile *"}</label>
                      <div className="flex gap-2">
                        <div className="w-24">
                          <CountrySelector selected={selectedCountry} onChange={setSelectedCountry} />
                        </div>
                        <input id="customer-phone" {...register("customer_phone")} type="tel" className={cn("input flex-1", errors.customer_phone && "input-error")} placeholder={selectedCountry === "BD" ? "01XXXXXXXXX" : "+..."} />
                      </div>
                      {errors.customer_phone && <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>}
                    </div>
                    <div>
                      <label className="form-label" htmlFor="customer-email">{lang === "bn" ? "ইমেইল" : "Email"}</label>
                      <input id="customer-email" {...register("customer_email")} type="email" className="input" placeholder="your@email.com" />
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
                        <button type="button" onClick={sendOtp} disabled={otpLoading || otpVerified || otpResendIn > 0} className="btn btn-outline btn-sm">
                          {otpVerified
                            ? <Check className="w-4 h-4 text-green-600" aria-label={lang === "bn" ? "ভেরিফাই হয়েছে" : "Verified"} />
                            : otpResendIn > 0
                              ? `${otpResendIn}s`
                              : otpSent
                                ? (lang === "bn" ? "আবার" : "Resend")
                                : "OTP"}
                        </button>
                      </div>
                      {otpVerified && <p className="text-xs text-green-600 dark:text-green-400">{lang === "bn" ? "ভেরিফাই হয়েছে" : "Verified"}</p>}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label" htmlFor="district">{lang === "bn" ? "জেলা *" : "District *"}</label>
                      <select id="district" {...register("district")} className={cn("input", errors.district && "input-error")}>
                        {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>}
                    </div>
                    <div>
                      <label className="form-label" htmlFor="upazila">{lang === "bn" ? "থানা / উপজেলা" : "Upazila / Thana"}</label>
                      <select id="upazila" {...register("upazila")} className="input">
                        <option value="">{lang === "bn" ? "বাছাই করুন" : "Select"}</option>
                        {upazilaOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">{lang === "bn" ? "ডেলিভারি চার্জ" : "Delivery"}</label>
                    <div className="input input-readonly flex items-center text-sm font-semibold">
                      {deliveryCharge === 0
                        ? (lang === "bn" ? "🎉 বিনামূল্যে" : "🎉 FREE")
                        : formatPrice(deliveryCharge)}
                    </div>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="street-address">{lang === "bn" ? "বিস্তারিত ঠিকানা *" : "Street Address *"}</label>
                    <textarea id="street-address" {...register("street_address")} rows={2} className={cn("input resize-none", errors.street_address && "input-error")}
                      placeholder={lang === "bn" ? "রোড, এলাকা, ইউনিয়ন..." : "Road, area, union..."} />
                    {errors.street_address && <p className="text-red-500 text-xs mt-1">{errors.street_address.message}</p>}
                  </div>
                  {/* X4 — an institution buying here got an invoice in an
                      individual's name, which their bookkeeping cannot accept,
                      and a government purchase cannot be settled at all without
                      a PO number on the bill. Collapsed by default so a personal
                      order never sees it. */}
                  <div className="border-t border-gray-100 dark:border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setCompanyOpen((v) => !v)}
                      aria-expanded={companyOpen}
                      aria-controls="checkout-company-fields"
                      className="w-full flex items-center justify-between gap-2 text-sm font-semibold text-heading py-1"
                    >
                      <span className="flex items-center gap-2">
                        <Building2 aria-hidden className="w-4 h-4 text-brand-600" />
                        {lang === "bn" ? "প্রতিষ্ঠানের নামে ইনভয়েস" : "Invoice to a company"}
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={cn("w-4 h-4 motion-safe:transition-transform", companyOpen && "rotate-180")}
                      />
                    </button>
                    <div id="checkout-company-fields" hidden={!companyOpen} className="space-y-3 mt-3">
                      <div>
                        <label className="form-label" htmlFor="co-name">{lang === "bn" ? "প্রতিষ্ঠানের নাম" : "Company name"}</label>
                        <input id="co-name" {...register("company_name")} className="input" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label" htmlFor="co-bin">BIN</label>
                          <input id="co-bin" {...register("company_bin")} className="input" />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="co-tin">TIN</label>
                          <input id="co-tin" {...register("company_tin")} className="input" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label" htmlFor="co-po">
                          {lang === "bn" ? "PO / ওয়ার্ক অর্ডার নম্বর" : "PO / work order number"}
                        </label>
                        <input id="co-po" {...register("po_number")} className="input" />
                        <p className="text-xs text-muted mt-1">
                          {lang === "bn"
                            ? "সরকারি ক্রয়ের বিল PO নম্বর ছাড়া পরিশোধ হয় না।"
                            : "Government purchases are not settled without it."}
                        </p>
                      </div>
                      <div>
                        <label className="form-label" htmlFor="co-billing">
                          {lang === "bn" ? "বিলিং ঠিকানা (ভিন্ন হলে)" : "Billing address (if different)"}
                        </label>
                        <textarea id="co-billing" {...register("billing_address")} rows={2} className="input resize-none" />
                      </div>
                    </div>
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          {(opt.gateway === "cod" || opt.gateway === "cash_on_delivery") && (
                            <span className="badge badge-default text-[10px]">
                              {lang === "bn" ? "জনপ্রিয়" : "Popular"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">{paymentConsequence(opt)}</p>
                        {opt.detail && opt.gateway !== "cod" && opt.gateway !== "cash_on_delivery" && (
                          <p className="text-[11px] text-muted mt-0.5 truncate">{opt.detail}</p>
                        )}
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

              <button type="submit" disabled={isSubmitting || stockIssue || signInRequired} className="btn btn-success btn-lg w-full hidden lg:flex">
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
                        {item.image_url ? <Image src={item.image_url} alt="" width={112} height={112} quality={85} className="object-cover w-full h-full" /> : <ShoppingBag className="w-6 h-6 text-brand-300 m-auto mt-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lang === "bn" ? item.name_bn : item.name_en}</p>
                        <p className="text-xs text-muted">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <p className="money text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  {couponsEnabled && (
                    <>
                      {!appliedCoupon ? (
                        <div className="flex gap-2 mb-3">
                          <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); if (couponError) setCouponError(null); }} placeholder={lang === "bn" ? "কুপন" : "Coupon"} className="input flex-1 text-sm py-2" aria-invalid={!!couponError} />
                          <button type="button" onClick={applyCoupon} className="btn btn-outline btn-sm"><Tag className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-between text-green-600 text-sm mb-2">
                          <span>{appliedCoupon.code}</span>
                          <button type="button" onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} className="text-xs text-gray-400">✕</button>
                        </div>
                      )}
                      {couponError && <p role="status" className="text-red-500 text-xs">{couponError}</p>}
                    </>
                  )}
                  <div className="flex justify-between"><span>{lang === "bn" ? "সাবটোটাল" : "Subtotal"}</span><span className="money">{formatPrice(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-green-600"><span>{lang === "bn" ? "ছাড়" : "Discount"}</span><span className="money">−{formatPrice(discount)}</span></div>}
                  {/* Announced: the charge changes when the district changes,
                      and a screen-reader user gets no repaint to notice. */}
                  <div className="flex justify-between" role="status">
                    <span>{lang === "bn" ? "ডেলিভারি" : "Delivery"}</span>
                    <span className="money">{deliveryCharge === 0 ? (lang === "bn" ? "ফ্রি" : "FREE") : formatPrice(deliveryCharge)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                    <span>{lang === "bn" ? "মোট" : "Total"}</span>
                    <span className="money text-green-600">{formatPrice(cartTotal)}</span>
                  </div>
                  {/*
                    Screen 11b — an advance order was one amber warning under
                    the total, so the customer read a single figure and then
                    found out at the door that it was not the figure they were
                    paying today. The split is now stated as two rows, the way
                    the total above it is: what leaves the wallet now, and what
                    the rider collects.

                    The amounts are the ones the order actually carries —
                    calcAdvanceCharge over the same settings the backend bills
                    from. The design's 30% split is not invented here; a
                    percentage the API does not compute would be a number this
                    page cannot honour.
                  */}
                  {advanceCharge > 0 && (
                    <div className="mt-2 pt-2 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-heading">
                          {lang === "bn" ? "এখন দিচ্ছেন" : "Paying now"}
                        </span>
                        <span className="money font-semibold">{formatPrice(advanceCharge)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">
                          {lang === "bn" ? "ডেলিভারিতে দেবেন" : "Paying on delivery"}
                        </span>
                        <span className="money text-muted">{formatPrice(Math.max(cartTotal - advanceCharge, 0))}</span>
                      </div>
                      <p className="text-xs text-muted">
                        {lang === "bn"
                          ? "অগ্রিম পাওয়ার পর অর্ডার কনফার্ম হবে।"
                          : "The order is confirmed once the advance is received."}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky-cta-bar px-4 py-3">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted truncate">
              {advanceCharge > 0
                ? (lang === "bn" ? "এখন · বাকি ডেলিভারিতে" : "now · rest on delivery")
                : (lang === "bn" ? "মোট" : "Total")}
            </p>
            <p className="money text-lg font-bold text-success-600">
              {formatPrice(advanceCharge > 0 ? advanceCharge : cartTotal)}
            </p>
          </div>
          <button type="submit" form="checkout-form" disabled={isSubmitting || stockIssue || signInRequired} className="btn btn-success btn-md min-w-[9rem]">
            {isSubmitting ? (lang === "bn" ? "প্রক্রিয়া..." : "Processing...") : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
