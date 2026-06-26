"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { formatPrice, generateWhatsAppOrderMessage, WHATSAPP_NUMBER } from "@/lib/utils";
import { ordersApi } from "@/lib/api";
import type { PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  customer_name: z.string().min(2, "নাম দিন (কমপক্ষে ২ অক্ষর)"),
  customer_phone: z
    .string()
    .regex(/^0[13-9]\d{8}$/, "সঠিক বাংলাদেশি নম্বর দিন (01XXXXXXXXX)"),
  delivery_address: z.string().min(10, "সম্পূর্ণ ঠিকানা দিন"),
  payment_method: z.enum(["bkash", "rocket", "bank", "cod"] as const),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; detail: string }[] = [
  { value: "bkash", label: "bKash", detail: "01825007977" },
  { value: "rocket", label: "Rocket", detail: "01825007977" },
  { value: "bank", label: "BRAC Bank", detail: "A/C: 1075869070001" },
  { value: "cod", label: "Cash on Delivery", detail: "ডেলিভারির সময়" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckoutModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const { lang } = useLanguageStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const cartTotal = total();

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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const orderItems = items.map((i) => ({
        product_id: i.product_id,
        product_name: i.name_en,
        product_price: i.price,
        quantity: i.quantity,
        subtotal: i.price * i.quantity,
      }));

      const response = await ordersApi.create({
        ...data,
        items: orderItems,
        subtotal: cartTotal,
        delivery_charge: 0,
        total: cartTotal,
        customer_email: data.customer_email || undefined,
      }).catch(() => ({ data: null }));

      const orderId = response?.data?.order_id;

      const waItems = items.map((i) => ({
        name: lang === "bn" ? i.name_bn : i.name_en,
        price: i.price,
        qty: i.quantity,
      }));

      const paymentLabel = PAYMENT_OPTIONS.find((p) => p.value === data.payment_method)?.label ?? data.payment_method;
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
      setIsSuccess(true);

      setTimeout(() => {
        onClose();
        if (orderId) {
          router.push(`/order-success?id=${orderId}`);
        }
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 gradient-brand rounded-t-2xl">
          <h2 className="text-white font-bold text-lg">
            {lang === "bn" ? "অর্ডার করুন" : "Place Order"}
          </h2>
          <button onClick={onClose} className="text-white hover:bg-white/20 w-9 h-9 rounded-lg flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {lang === "bn" ? "অর্ডার হয়েছে!" : "Order Placed!"}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {lang === "bn"
                ? "WhatsApp খুলে গেছে। আমরা শীঘ্রই যোগাযোগ করব।"
                : "WhatsApp opened. We'll contact you shortly."}
            </p>
            <button onClick={onClose} className="btn btn-brand btn-md">
              {lang === "bn" ? "ঠিক আছে" : "Done"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-sm text-gray-700 mb-3">
                {lang === "bn" ? "অর্ডার সারসংক্ষেপ" : "Order Summary"}
              </p>
              {items.map((i) => (
                <div key={i.product_id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {lang === "bn" ? i.name_bn : i.name_en} ×{i.quantity}
                  </span>
                  <span className="font-medium">{formatPrice(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                <span>{lang === "bn" ? "মোট" : "Total"}</span>
                <span className="text-accent-500">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "bn" ? "আপনার নাম *" : "Full Name *"}
                </label>
                <input
                  {...register("customer_name")}
                  className={cn("input", errors.customer_name && "input-error")}
                  placeholder={lang === "bn" ? "আপনার নাম লিখুন" : "Enter your full name"}
                />
                {errors.customer_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "bn" ? "মোবাইল নম্বর *" : "Mobile Number *"}
                </label>
                <input
                  {...register("customer_phone")}
                  type="tel"
                  className={cn("input", errors.customer_phone && "input-error")}
                  placeholder="01XXXXXXXXX"
                />
                {errors.customer_phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === "bn" ? "ডেলিভারি ঠিকানা *" : "Delivery Address *"}
                </label>
                <textarea
                  {...register("delivery_address")}
                  rows={2}
                  className={cn("input resize-none", errors.delivery_address && "input-error")}
                  placeholder={lang === "bn" ? "বিস্তারিত ঠিকানা লিখুন" : "Street, Area, District"}
                />
                {errors.delivery_address && (
                  <p className="text-red-500 text-xs mt-1">{errors.delivery_address.message}</p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {lang === "bn" ? "পেমেন্ট পদ্ধতি *" : "Payment Method *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all",
                      selectedPayment === opt.value
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register("payment_method")}
                      className="sr-only"
                    />
                    <span className="font-semibold text-sm text-gray-900">{opt.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{opt.detail}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-lg w-full"
            >
              {isSubmitting
                ? lang === "bn" ? "প্রক্রিয়া হচ্ছে..." : "Processing..."
                : lang === "bn" ? "WhatsApp-এ অর্ডার করুন" : "Order via WhatsApp"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
