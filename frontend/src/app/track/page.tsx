"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, Loader2, CheckCircle2, Truck, Clock, XCircle, ExternalLink } from "lucide-react";
import { ordersApi, bookingsApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { buildCourierTrackingUrl } from "@/lib/courierTracking";
import PageHero from "@/components/ui/PageHero";

interface TrackResult {
  kind: "order" | "booking";
  reference: string;          // order_number or booking_number
  status: string;             // order_status or booking_status
  total?: number | null;
  estimated_price?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  items_count?: number;
  service_name?: string | null;
  created_at: string;
  courier_provider?: string | null;
  courier_tracking_id?: string | null;
}

const ORDER_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];
const BOOKING_STEPS = ["pending", "confirmed", "in_progress", "completed"];

const STATUS_LABELS: Record<string, { en: string; bn: string }> = {
  pending: { en: "Pending", bn: "অপেক্ষমাণ" },
  confirmed: { en: "Confirmed", bn: "নিশ্চিত" },
  processing: { en: "Processing", bn: "প্রক্রিয়াধীন" },
  shipped: { en: "Shipped", bn: "পাঠানো হয়েছে" },
  delivered: { en: "Delivered", bn: "ডেলিভারি সম্পন্ন" },
  in_progress: { en: "In Progress", bn: "কাজ চলছে" },
  completed: { en: "Completed", bn: "সম্পন্ন" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5" />,
  confirmed: <CheckCircle2 className="w-5 h-5" />,
  processing: <Package className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  delivered: <CheckCircle2 className="w-5 h-5" />,
  in_progress: <Package className="w-5 h-5" />,
  completed: <CheckCircle2 className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
};

function TrackContent() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const { settings } = usePublicSettings(["courier_pathao_url", "courier_steadfast_url"]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  const handleTrack = async (reference?: string) => {
    const num = (reference ?? input).trim();
    if (!num) return;
    setLoading(true);
    setError("");
    setResult(null);
    // Booking numbers: BK-… (v2) or ABO-B-… (legacy printing/legal).
    const upper = num.toUpperCase();
    const isBooking = upper.startsWith("BK-") || upper.startsWith("ABO-B-");
    try {
      if (isBooking) {
        const r = await bookingsApi.track(num);
        const d = r.data.data;
        setResult({
          kind: "booking",
          reference: d.booking_number,
          status: d.booking_status,
          total: d.total,
          estimated_price: d.estimated_price,
          payment_status: d.payment_status,
          service_name: d.service_name,
          created_at: d.created_at,
        });
      } else {
        const r = await ordersApi.track(num);
        const d = r.data.data;
        setResult({
          kind: "order",
          reference: d.order_number,
          status: d.order_status,
          total: d.total,
          payment_method: d.payment_method,
          payment_status: d.payment_status,
          items_count: d.items_count,
          created_at: d.created_at,
          courier_provider: d.courier_provider,
          courier_tracking_id: d.courier_tracking_id,
        });
      }
    } catch {
      setError(
        lang === "bn"
          ? "অর্ডার বা বুকিং পাওয়া যায়নি। নম্বরটি যাচাই করে আবার চেষ্টা করুন।"
          : "Order or booking not found. Please check the number and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ref = params.get("order") || params.get("booking");
    if (ref) {
      setInput(ref);
      handleTrack(ref);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = result?.kind === "booking" ? BOOKING_STEPS : ORDER_STEPS;
  const stepIndex = result ? steps.indexOf(result.status) : -1;
  const isCancelled = result?.status === "cancelled";
  const courierUrl = result
    ? buildCourierTrackingUrl(result.courier_provider, result.courier_tracking_id, settings)
    : null;

  return (
    <main className="min-h-screen page-surface pb-mobile-nav lg:pb-16">
      <PageHero
        pageKey="track"
        align="center"
        title={lang === "bn" ? "ট্র্যাক করুন" : "Track Your Order"}
        subtitle={
          lang === "bn"
            ? "অর্ডার বা বুকিং নম্বর দিয়ে বর্তমান অবস্থা দেখুন"
            : "Enter your order or booking number to see the current status"
        }
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "ট্র্যাক" : "Track" },
        ]}
      />

      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="surface-card rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              placeholder={lang === "bn" ? "যেমন ABO-… বা BK-…" : "e.g. ABO-… or BK-…"}
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {result.kind === "booking"
                    ? lang === "bn" ? "বুকিং নম্বর" : "Booking Number"
                    : lang === "bn" ? "অর্ডার নম্বর" : "Order Number"}
                </p>
                <p className="text-lg font-bold text-heading break-all">{result.reference}</p>
                {result.kind === "booking" && result.service_name && (
                  <p className="text-sm text-brand-600 dark:text-brand-300 mt-0.5">{result.service_name}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {lang === "bn" ? "মোট" : "Total"}
                </p>
                <p className="text-lg font-bold text-brand-600">
                  {result.total != null && result.total > 0
                    ? formatPrice(result.total)
                    : result.estimated_price || (lang === "bn" ? "কোটেশন" : "On quote")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
                {result.kind === "booking" ? (
                  <>
                    <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "ধরন" : "Type"}</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{lang === "bn" ? "সেবা" : "Service"}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "পণ্য" : "Items"}</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{result.items_count}</p>
                  </>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "পেমেন্ট" : "Payment"}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                  {result.payment_method || (result.payment_status ?? "—")}
                </p>
                {result.payment_method && result.payment_status && (
                  <p className="text-[10px] text-muted capitalize mt-0.5">{result.payment_status}</p>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{lang === "bn" ? "তারিখ" : "Date"}</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{new Date(result.created_at).toLocaleDateString("bn-BD")}</p>
              </div>
            </div>

            {result.courier_tracking_id && (
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 dark:bg-brand-900/20 p-4">
                <p className="text-xs text-brand-600 uppercase tracking-wider mb-2">
                  {lang === "bn" ? "কুরিয়ার ট্র্যাকিং" : "Courier Tracking"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold capitalize">{result.courier_provider ?? "Courier"}</span>
                  <code className="text-sm bg-white dark:bg-[var(--surface-card)] px-2 py-0.5 rounded">{result.courier_tracking_id}</code>
                  {courierUrl && (
                    <a href={courierUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm gap-1 ml-auto">
                      <ExternalLink className="w-3.5 h-3.5" />
                      {lang === "bn" ? "লাইভ ট্র্যাক" : "Track Live"}
                    </a>
                  )}
                </div>
              </div>
            )}

            {isCancelled ? (
              <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4">
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700">
                    {result.kind === "booking"
                      ? lang === "bn" ? "বুকিং বাতিল" : "Booking Cancelled"
                      : lang === "bn" ? "অর্ডার বাতিল" : "Order Cancelled"}
                  </p>
                  <p className="text-sm text-red-500">
                    {result.kind === "booking"
                      ? lang === "bn" ? "এই বুকিংটি বাতিল করা হয়েছে।" : "This booking has been cancelled."
                      : lang === "bn" ? "এই অর্ডারটি বাতিল করা হয়েছে।" : "This order has been cancelled."}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                  {result.kind === "booking"
                    ? lang === "bn" ? "বুকিং অগ্রগতি" : "Booking Progress"
                    : lang === "bn" ? "অর্ডার অগ্রগতি" : "Order Progress"}
                </p>
                <div className="relative">
                  <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-100 dark:bg-white/10" />
                  <div className="space-y-4">
                    {steps.map((step, i) => {
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
