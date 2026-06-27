"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, Loader2, CheckCircle2, Truck, Clock, XCircle } from "lucide-react";
import { ordersApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

interface TrackResult {
  order_number: string;
  order_status: string;
  payment_method: string;
  total: number;
  items_count: number;
  created_at: string;
}

const STATUS_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_LABELS: Record<string, { en: string; bn: string }> = {
  pending: { en: "Pending", bn: "অপেক্ষমাণ" },
  confirmed: { en: "Confirmed", bn: "নিশ্চিত" },
  processing: { en: "Processing", bn: "প্রক্রিয়াধীন" },
  shipped: { en: "Shipped", bn: "পাঠানো হয়েছে" },
  delivered: { en: "Delivered", bn: "ডেলিভারি সম্পন্ন" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5" />,
  confirmed: <CheckCircle2 className="w-5 h-5" />,
  processing: <Package className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle2 className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
};

function TrackContent() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  const handleTrack = async (orderNumber?: string) => {
    const num = (orderNumber ?? input).trim();
    if (!num) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const r = await ordersApi.track(num);
      setResult(r.data.data as TrackResult);
    } catch {
      setError(
        lang === "bn"
          ? "অর্ডার পাওয়া যায়নি। অর্ডার নম্বর যাচাই করে আবার চেষ্টা করুন।"
          : "Order not found. Please check the order number and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const orderParam = params.get("order");
    if (orderParam) {
      setInput(orderParam);
      handleTrack(orderParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = result ? STATUS_STEPS.indexOf(result.order_status) : -1;
  const isCancelled = result?.order_status === "cancelled";

  return (
    <main className="min-h-screen page-surface py-16 px-4 pb-mobile-nav lg:pb-16">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-100 dark:bg-brand-900/40 rounded-2xl mb-4">
            <Package className="w-7 h-7 text-brand-600 dark:text-brand-300" />
          </div>
          <h1 className="text-3xl font-bold text-heading mb-2">
            {lang === "bn" ? "অর্ডার ট্র্যাক করুন" : "Track Your Order"}
          </h1>
          <p className="text-muted">
            {lang === "bn"
              ? "অর্ডার নম্বর দিয়ে বর্তমান অবস্থা দেখুন"
              : "Enter your order number to see the current status"}
          </p>
        </div>

        <div className="surface-card rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              placeholder="e.g. ABO-20240101-0001"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => handleTrack()}
              disabled={loading || !input.trim()}
              className="btn btn-brand btn-md px-5 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {lang === "bn" ? "ট্র্যাক" : "Track"}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>

        {result && (
          <div className="surface-card rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}
                </p>
                <p className="text-lg font-bold text-heading">{result.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {lang === "bn" ? "মোট" : "Total"}
                </p>
                <p className="text-lg font-bold text-brand-600">{formatPrice(result.total)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "পণ্য" : "Items"}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{result.items_count}</p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "পেমেন্ট" : "Payment"}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{result.payment_method}</p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "তারিখ" : "Date"}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{new Date(result.created_at).toLocaleDateString("bn-BD")}</p>
              </div>
            </div>

            {isCancelled ? (
              <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">
                    {lang === "bn" ? "অর্ডার বাতিল" : "Order Cancelled"}
                  </p>
                  <p className="text-sm text-red-500">
                    {lang === "bn" ? "এই অর্ডারটি বাতিল করা হয়েছে।" : "This order has been cancelled."}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                  {lang === "bn" ? "অর্ডার অগ্রগতি" : "Order Progress"}
                </p>
                <div className="relative">
                  <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-100 dark:bg-white/10" />
                  <div className="space-y-4">
                    {STATUS_STEPS.map((step, i) => {
                      const done = i <= stepIndex;
                      const active = i === stepIndex;
                      const label = STATUS_LABELS[step];
                      return (
                        <div key={step} className="relative flex items-center gap-4">
                          <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            done
                              ? active
                                ? "bg-brand-600 text-white"
                                : "bg-green-500 text-white"
                              : "bg-gray-100 dark:bg-white/10 text-gray-300 dark:text-gray-600"
                          }`}>
                            {STATUS_ICON[step]}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${done ? "text-heading" : "text-gray-400"}`}>
                              {lang === "bn" ? label.bn : label.en}
                            </p>
                            {active && (
                              <p className="text-xs text-brand-500">
                                {lang === "bn" ? "বর্তমান অবস্থা" : "Current status"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <TrackContent />
    </Suspense>
  );
}
