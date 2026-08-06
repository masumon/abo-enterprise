"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Truck, Package, Phone, Calendar, ArrowLeft, CreditCard, ClipboardList } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { cn } from "@/lib/utils";
import { ordersApi, bookingsApi } from "@/lib/api";
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

// Real backend enums (backend/app/api/v1/routes/orders.py, bulk.py for orders;
// booking status set mirrors the same admin-facing vocabulary) - not guessed.
const ORDER_STATUS_LABEL: Record<string, { en: string; bn: string; color: string }> = {
  pending: { en: "Pending", bn: "অপেক্ষমাণ", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  confirmed: { en: "Confirmed", bn: "নিশ্চিত হয়েছে", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" },
  processing: { en: "Processing", bn: "প্রক্রিয়াধীন", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  shipped: { en: "Shipped", bn: "পাঠানো হয়েছে", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" },
  delivered: { en: "Delivered", bn: "ডেলিভার হয়েছে", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  cancelled: { en: "Cancelled", bn: "বাতিল হয়েছে", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
};

const BOOKING_STATUS_LABEL: Record<string, { en: string; bn: string; color: string }> = {
  pending: { en: "Pending", bn: "অপেক্ষমাণ", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  confirmed: { en: "Confirmed", bn: "নিশ্চিত হয়েছে", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" },
  in_progress: { en: "In Progress", bn: "চলমান", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  on_hold: { en: "On Hold", bn: "স্থগিত", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" },
  completed: { en: "Completed", bn: "সম্পন্ন হয়েছে", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  cancelled: { en: "Cancelled", bn: "বাতিল হয়েছে", color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
};

export default function TrackingPage() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Every real link in the product sends ?order= or ?booking= (order-success,
  // booking-success, payment callback, invoices) - this page previously only
  // read ?id=, which none of them send.
  const orderNumber = params.get("order");
  const bookingNumber = params.get("booking");

  useEffect(() => {
    let cancelled = false;

    if (!orderNumber && !bookingNumber) {
      setError(lang === "bn" ? "একটি অর্ডার বা বুকিং নম্বর প্রয়োজন" : "An order or booking number is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (orderNumber) {
          const res = await ordersApi.track(orderNumber);
          const d = res.data.data;
          if (cancelled || !d) return;
          setTracking({
            kind: "order",
            number: d.order_number,
            status: d.order_status,
            payment_method: d.payment_method,
            payment_status: d.payment_status,
            total: d.total,
            items_count: d.items_count,
            created_at: d.created_at,
            courier_provider: d.courier_provider,
            courier_tracking_id: d.courier_tracking_id,
          });
        } else if (bookingNumber) {
          const res = await bookingsApi.track(bookingNumber);
          const d = res.data.data;
          if (cancelled || !d) return;
          setTracking({
            kind: "booking",
            number: d.booking_number,
            status: d.booking_status,
            service_name: d.service_name,
            payment_status: d.payment_status,
            total: d.total,
            estimated_price: d.estimated_price,
            created_at: d.created_at,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err, lang === "bn" ? "খুঁজে পাওয়া যায়নি" : "Not found"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, bookingNumber, lang]);

  const t = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const statusMap = tracking?.kind === "booking" ? BOOKING_STATUS_LABEL : ORDER_STATUS_LABEL;
  const status = tracking ? statusMap[tracking.status] : null;

  return (
    <main>
      <PageHero
        pageKey="track"
        title={lang === "bn" ? "ট্র্যাক করুন" : "Track"}
        subtitle={lang === "bn" ? "আপনার অর্ডার বা বুকিং অনুসরণ করুন" : "Follow your order or booking"}
        breadcrumbs={[{ label: lang === "bn" ? "ট্র্যাক" : "Track" }]}
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-3xl">
          {loading && (
            <div className="enterprise-card p-8 text-center">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted">{t("Loading tracking information...", "তথ্য লোড হচ্ছে...")}</p>
            </div>
          )}

          {error && !loading && (
            <div className="enterprise-card p-6 text-center border border-red-200 bg-red-50 text-red-700">
              <p className="mb-4">{error}</p>
              <Link href="/" className="btn btn-outline btn-sm">
                {t("Go home", "হোমে যান")}
              </Link>
            </div>
          )}

          {tracking && !loading && !error && (
            <div className="enterprise-card p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0", status?.color ?? "bg-gray-100 text-gray-600")}>
                  {tracking.kind === "order" ? <Package className="w-8 h-8" /> : <ClipboardList className="w-8 h-8" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-heading mb-1 truncate">
                    {tracking.kind === "order"
                      ? t(`Order ${tracking.number}`, `অর্ডার ${tracking.number}`)
                      : t(`Booking ${tracking.number}`, `বুকিং ${tracking.number}`)}
                  </h2>
                  <p className={cn("inline-block text-sm font-semibold px-2.5 py-0.5 rounded-full", status?.color ?? "bg-gray-100 text-gray-600")}>
                    {status ? (lang === "bn" ? status.bn : status.en) : tracking.status}
                  </p>
                </div>
                <Link href="/" className="text-muted hover:text-heading flex-shrink-0">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/10 pt-6">
                {tracking.kind === "booking" && tracking.service_name && (
                  <div className="flex items-start gap-3">
                    <ClipboardList className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t("Service", "সেবা")}</p>
                      <p className="font-semibold text-heading">{tracking.service_name}</p>
                    </div>
                  </div>
                )}
                {tracking.kind === "order" && tracking.items_count != null && (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t("Items", "আইটেম")}</p>
                      <p className="font-semibold text-heading">{tracking.items_count}</p>
                    </div>
                  </div>
                )}
                {(tracking.total != null || (tracking.kind === "booking" && tracking.estimated_price)) && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t("Total", "মোট")}</p>
                      <p className="font-semibold text-heading">
                        {tracking.total != null ? formatPrice(tracking.total) : tracking.kind === "booking" ? tracking.estimated_price : "—"}
                      </p>
                    </div>
                  </div>
                )}
                {tracking.payment_status && (
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t("Payment", "পেমেন্ট")}</p>
                      <p className="font-semibold text-heading capitalize">{tracking.payment_status}</p>
                    </div>
                  </div>
                )}
                {tracking.kind === "order" && tracking.courier_provider && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted mb-0.5">{t("Courier", "কুরিয়ার")}</p>
                      <p className="font-semibold text-heading capitalize">
                        {tracking.courier_provider}
                        {tracking.courier_tracking_id ? ` · ${tracking.courier_tracking_id}` : ""}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted mb-0.5">{t("Placed on", "যেদিন করা হয়েছে")}</p>
                    <p className="font-semibold text-heading">
                      {new Date(tracking.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-white/10 mt-6 pt-6 flex flex-col sm:flex-row gap-3">
                <a href="tel:+8801825007977" className="btn btn-outline btn-sm flex-1 justify-center">
                  <Phone className="w-4 h-4" />
                  {t("Call support", "সাপোর্টে কল করুন")}
                </a>
                <Link href={tracking.kind === "order" ? "/orders" : "/profile"} className="btn btn-outline btn-sm flex-1 justify-center">
                  {t("View all", "সব দেখুন")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
