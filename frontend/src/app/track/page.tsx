"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, Package, Phone, Calendar, ArrowLeft, CreditCard, ClipboardList, Search, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { cn } from "@/lib/utils";
import { ordersApi, bookingsApi } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/apiBase";
import { formatPrice } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/apiError";

type OrderTracking = {
  kind: "order";
  number: string;
  status: string;
  payment_method?: string;
  payment_status?: string;
  total?: number;
  items_count?: number;
  created_at: string;
  courier_provider?: string | null;
  courier_tracking_id?: string | null;
  courier_live_status?: string | null;
};

type BookingTracking = {
  kind: "booking";
  number: string;
  status: string;
  service_name?: string;
  payment_status?: string | null;
  total?: number | null;
  estimated_price?: string | null;
  created_at: string;
};

type Tracking = OrderTracking | BookingTracking;

const ORDER_STATUS_LABEL: Record<string, { en: string; bn: string; color: string }> = {
  pending: { en: "Pending", bn: "অপেক্ষমাণ", color: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300" },
  confirmed: { en: "Confirmed", bn: "নিশ্চিত হয়েছে", color: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300" },
  processing: { en: "Processing", bn: "প্রক্রিয়াধীন", color: "bg-accent-50 text-accent-800 dark:bg-accent-500/20 dark:text-accent-300" },
  shipped: { en: "Shipped", bn: "পাঠানো হয়েছে", color: "bg-accent-100 text-accent-900 dark:bg-accent-500/25 dark:text-accent-200" },
  delivered: { en: "Delivered", bn: "ডেলিভার হয়েছে", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  cancelled: { en: "Cancelled", bn: "বাতিল হয়েছে", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
};

const BOOKING_STATUS_LABEL: Record<string, { en: string; bn: string; color: string }> = {
  pending: { en: "Pending", bn: "অপেক্ষমাণ", color: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300" },
  confirmed: { en: "Confirmed", bn: "নিশ্চিত হয়েছে", color: "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300" },
  in_progress: { en: "In Progress", bn: "চলমান", color: "bg-accent-50 text-accent-800 dark:bg-accent-500/20 dark:text-accent-300" },
  on_hold: { en: "On Hold", bn: "স্থগিত", color: "bg-accent-100 text-accent-900 dark:bg-accent-500/25 dark:text-accent-200" },
  completed: { en: "Completed", bn: "সম্পন্ন হয়েছে", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  cancelled: { en: "Cancelled", bn: "বাতিল হয়েছে", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
};

function formatCourierStatus(value: string, lang: string): string {
  const status = value.toLowerCase();
  const labels: Record<string, [string, string]> = {
    pending: ["Pending", "অপেক্ষমাণ"],
    in_review: ["In review", "পর্যালোচনাধীন"],
    hold: ["On hold", "স্থগিত"],
    delivered: ["Delivered", "ডেলিভার হয়েছে"],
    cancelled: ["Cancelled", "বাতিল হয়েছে"],
    delivered_approval_pending: ["Delivered — approval pending", "ডেলিভারি হয়েছে — অনুমোদন বাকি"],
    partial_delivered_approval_pending: ["Partially delivered — approval pending", "আংশিক ডেলিভারি — অনুমোদন বাকি"],
    cancelled_approval_pending: ["Cancelled — approval pending", "বাতিল — অনুমোদন বাকি"],
  };
  return labels[status]?.[lang === "bn" ? 1 : 0] ?? value.replace(/_/g, " ");
}

export default function TrackingPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { lang } = useLanguageStore();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const orderNumber = params.get("order");
  const bookingNumber = params.get("booking");
  const query = params.get("q");

  useEffect(() => {
    let cancelled = false;
    if (!orderNumber && !bookingNumber && !query) {
      setTracking(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setTracking(null);

    const mapOrder = (d: Record<string, unknown> & { order_number: string; order_status: string }): OrderTracking => ({
      kind: "order", number: d.order_number, status: d.order_status,
      payment_method: d.payment_method as string, payment_status: d.payment_status as string,
      total: d.total as number, items_count: d.items_count as number, created_at: d.created_at as string,
      courier_provider: d.courier_provider as string | null, courier_tracking_id: d.courier_tracking_id as string | null,
    });
    const mapBooking = (d: Record<string, unknown> & { booking_number: string; booking_status: string }): BookingTracking => ({
      kind: "booking", number: d.booking_number, status: d.booking_status,
      service_name: d.service_name as string, payment_status: d.payment_status as string | null,
      total: d.total as number | null, estimated_price: d.estimated_price as string | null, created_at: d.created_at as string,
    });

    const load = async () => {
      const tryOrder = orderNumber || query;
      const tryBooking = bookingNumber || query;
      try {
        if (tryOrder) {
          try {
            const res = await ordersApi.track(tryOrder);
            const d = res.data.data;
            if (cancelled) return;
            if (d) {
              const mapped = mapOrder(d);
              setTracking(mapped);

              // If this order has a Steadfast shipment, fetch the live provider
              // status server-side. Failure here does not hide the local order.
              if (mapped.courier_provider === "steadfast" && mapped.courier_tracking_id) {
                try {
                  const live = await fetch(
                    `${getApiBaseUrl()}/api/v1/courier/track?order=${encodeURIComponent(mapped.number)}`,
                    { cache: "no-store" },
                  );
                  const liveJson = (await live.json().catch(() => null)) as { data?: { status?: string | null } } | null;
                  const liveStatus = liveJson?.data?.status;
                  if (!cancelled && live.ok && liveStatus) {
                    setTracking((prev) => prev?.kind === "order" ? { ...prev, courier_live_status: liveStatus } : prev);
                  }
                } catch {
                  // Local order tracking remains usable when the provider is unavailable.
                }
              }
              return;
            }
          } catch {
            if (!query) throw new Error("order");
          }
        }
        if (tryBooking) {
          const res = await bookingsApi.track(tryBooking);
          const d = res.data.data;
          if (cancelled) return;
          if (d) { setTracking(mapBooking(d)); return; }
        }
        if (!cancelled) setError(lang === "bn" ? "এই নম্বরে কিছু খুঁজে পাওয়া যায়নি — নম্বরটি দেখে নিন" : "Nothing found for that number — please check it");
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, lang === "bn" ? "খুঁজে পাওয়া যায়নি" : "Not found"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [orderNumber, bookingNumber, query, lang]);

  useEffect(() => { if (query || orderNumber || bookingNumber) setInput(query || orderNumber || bookingNumber || ""); }, [query, orderNumber, bookingNumber]);

  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const num = input.trim();
    if (!num) return;
    router.replace(`/track?q=${encodeURIComponent(num)}`);
  };
  const statusMap = tracking?.kind === "booking" ? BOOKING_STATUS_LABEL : ORDER_STATUS_LABEL;
  const status = tracking ? statusMap[tracking.status] : null;
  const isIdle = !loading && !error && !tracking;

  return (
    <main>
      <PageHero
        pageKey="track"
        title={lang === "bn" ? "ট্র্যাক করুন" : "Track"}
        subtitle={lang === "bn" ? "আপনার অর্ডার বা বুকিং অনুসরণ করুন" : "Follow your order or booking"}
        breadcrumbs={[{ label: lang === "bn" ? "ট্র্যাক" : "Track" }]}
      />

      <section className="enterprise-section">
        <div className={cn("container mx-auto px-4 max-w-3xl", isIdle && "min-h-[60vh] flex flex-col justify-center")}>
          <div className={cn(isIdle && "w-full max-w-md mx-auto")}>
            {isIdle && (
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-lg shadow-brand-900/20">
                  <Package className="w-8 h-8 text-white" aria-hidden />
                </div>
                <h2 className="text-xl font-bold text-heading">{t("Track your order or booking", "আপনার অর্ডার বা বুকিং ট্র্যাক করুন")}</h2>
                <p className="text-sm text-muted mt-1">{t("Enter the number to see live status.", "লাইভ স্ট্যাটাস দেখতে নম্বরটি লিখুন।")}</p>
              </div>
            )}
            <form onSubmit={submitSearch} className={cn("enterprise-card p-4 sm:p-5", !isIdle && "mb-6")}>
              {!isIdle && <label className="block text-sm font-semibold text-heading mb-2">{t("Enter your order or booking number", "আপনার অর্ডার বা বুকিং নম্বর লিখুন")}</label>}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("e.g. ABO-202608-AB12CD", "যেমন ABO-202608-AB12CD")} className="input flex-1 text-center sm:text-left" aria-label={t("Order or booking number", "অর্ডার বা বুকিং নম্বর")} />
                <button type="submit" disabled={loading || !input.trim()} className="btn btn-primary btn-md gap-2 sm:w-auto">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {t("Track", "ট্র্যাক করুন")}
                </button>
              </div>
              <p className={cn("text-xs text-muted mt-2", isIdle && "text-center")}>{t("You'll find this number in your order/booking confirmation.", "এই নম্বরটি আপনার অর্ডার/বুকিং কনফার্মেশনে পাবেন।")}</p>
            </form>
          </div>

          {loading && <div className="enterprise-card p-8 text-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" /><p className="text-muted">{t("Loading tracking information...", "তথ্য লোড হচ্ছে...")}</p></div>}

          {error && !loading && <div className="enterprise-card p-6 text-center border border-red-200 bg-red-50 text-red-700"><p className="mb-4">{error}</p><Link href="/" className="btn btn-outline btn-sm">{t("Go home", "হোমে যান")}</Link></div>}

          {tracking && !loading && !error && (
            <div className="enterprise-card p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0", status?.color ?? "bg-gray-100 text-gray-600")}>
                  {tracking.kind === "order" ? <Package className="w-8 h-8" /> : <ClipboardList className="w-8 h-8" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-heading mb-1 truncate">{tracking.kind === "order" ? t(`Order ${tracking.number}`, `অর্ডার ${tracking.number}`) : t(`Booking ${tracking.number}`, `বুকিং ${tracking.number}`)}</h2>
                  <p className={cn("inline-block text-sm font-semibold px-2.5 py-0.5 rounded-full", status?.color ?? "bg-gray-100 text-gray-600")}>{status ? (lang === "bn" ? status.bn : status.en) : tracking.status}</p>
                </div>
                <Link href="/" className="text-muted hover:text-heading flex-shrink-0"><ArrowLeft className="w-5 h-5" /></Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/10 pt-6">
                {tracking.kind === "booking" && tracking.service_name && <div className="flex items-start gap-3"><ClipboardList className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Service", "সেবা")}</p><p className="font-semibold text-heading">{tracking.service_name}</p></div></div>}
                {tracking.kind === "order" && tracking.items_count != null && <div className="flex items-start gap-3"><Package className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Items", "আইটেম")}</p><p className="font-semibold text-heading">{tracking.items_count}</p></div></div>}
                {(tracking.total != null || (tracking.kind === "booking" && tracking.estimated_price)) && <div className="flex items-start gap-3"><CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Total", "মোট")}</p><p className="font-semibold text-heading">{tracking.total != null ? formatPrice(tracking.total) : tracking.kind === "booking" ? tracking.estimated_price : "—"}</p></div></div>}
                {tracking.payment_status && <div className="flex items-start gap-3"><CreditCard className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Payment", "পেমেন্ট")}</p><p className="font-semibold text-heading capitalize">{tracking.payment_status}</p></div></div>}
                {tracking.kind === "order" && tracking.courier_provider && <div className="flex items-start gap-3"><Truck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Courier", "কুরিয়ার")}</p><p className="font-semibold text-heading capitalize">{tracking.courier_provider}{tracking.courier_tracking_id ? ` · ${tracking.courier_tracking_id}` : ""}</p></div></div>}
                {tracking.kind === "order" && tracking.courier_live_status && <div className="flex items-start gap-3"><Truck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Live courier status", "লাইভ কুরিয়ার স্ট্যাটাস")}</p><p className="font-semibold text-green-700 dark:text-green-300">{formatCourierStatus(tracking.courier_live_status, lang)}</p></div></div>}
                <div className="flex items-start gap-3"><Calendar className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" /><div><p className="text-xs text-muted mb-0.5">{t("Placed on", "যেদিন করা হয়েছে")}</p><p className="font-semibold text-heading">{new Date(tracking.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</p></div></div>
              </div>

              <div className="border-t border-gray-100 dark:border-white/10 mt-6 pt-6 flex flex-col sm:flex-row gap-3">
                <a href="tel:+8801825007977" className="btn btn-outline btn-sm flex-1 justify-center"><Phone className="w-4 h-4" />{t("Call support", "সাপোর্টে কল করুন")}</a>
                <Link href={tracking.kind === "order" ? "/orders" : "/profile"} className="btn btn-outline btn-sm flex-1 justify-center">{t("View all", "সব দেখুন")}</Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
