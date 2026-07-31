"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Truck, Package, MapPin, Phone, Calendar, Clock, ArrowLeft } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import { cn } from "@/lib/utils";

interface TrackingInfo {
  tracking_id: string;
  courier: "pathao" | "steadfast";
  status: "pending" | "in_transit" | "out_for_delivery" | "delivered";
  current_location?: string;
  estimated_delivery?: string;
  last_update?: string;
  rider_name?: string;
  rider_phone?: string;
  events: Array<{
    timestamp: string;
    status: string;
    location: string;
    notes?: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

const STATUS_ICONS: Record<string, typeof Package> = {
  pending: Package,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: Package,
};

export default function TrackingPage() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trackingId = params.get("id");

  useEffect(() => {
    if (!trackingId) {
      setError(lang === "bn" ? "ট্র্যাকিং ID দিন" : "Tracking ID required");
      setLoading(false);
      return;
    }

    // Simulate API call - replace with actual backend integration
    // In production: await courierApi.getTracking(trackingId)
    const mockTracking: TrackingInfo = {
      tracking_id: trackingId,
      courier: "pathao",
      status: "in_transit",
      current_location: "Dhaka - Gulshan",
      estimated_delivery: "Today by 8 PM",
      last_update: new Date().toISOString(),
      rider_name: "Ahmed Hassan",
      rider_phone: "+880 1712345678",
      events: [
        {
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: "in_transit",
          location: "Dhaka - Dhanmondi",
          notes: "Package picked up",
        },
        {
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: "pending",
          location: "Dhaka - Mirpur Hub",
          notes: "Parcel received",
        },
      ],
    };

    setTracking(mockTracking);
    setLoading(false);
  }, [trackingId, lang]);

  const t = (en: string, bn: string) => lang === "bn" ? bn : en;
  const StatusIcon = tracking ? STATUS_ICONS[tracking.status] : Package;

  return (
    <main>
      <PageHero
        pageKey="track"
        title={lang === "bn" ? "ট্র্যাক অর্ডার" : "Track Order"}
        subtitle={lang === "bn" ? "আপনার ডেলিভারি অনুসরণ করুন" : "Follow your delivery"}
        breadcrumbs={[{ label: lang === "bn" ? "ট্র্যাক" : "Track" }]}
      />

      <section className="enterprise-section">
        <div className="container mx-auto px-4 max-w-3xl">
          {loading && (
            <div className="enterprise-card p-8 text-center">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted">{t("Loading tracking information...", "ট্র্যাকিং তথ্য লোড হচ্ছে...")}</p>
            </div>
          )}

          {error && (
            <div className="enterprise-card p-6 text-center border border-red-200 bg-red-50 text-red-700">
              <p className="mb-4">{error}</p>
              <Link href="/" className="btn btn-outline btn-sm">
                {t("Go home", "হোমে যান")}
              </Link>
            </div>
          )}

          {tracking && !loading && (
            <>
              {/* Status Card */}
              <div className="enterprise-card p-6 mb-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", STATUS_COLORS[tracking.status])}>
                    <StatusIcon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-heading mb-1">
                      {t("Tracking ID: " + tracking.tracking_id, "ট্র্যাকিং ID: " + tracking.tracking_id)}
                    </h2>
                    <p className={cn("text-sm font-semibold", STATUS_COLORS[tracking.status])}>
                      {tracking.status === "pending" && t("Pending", "অপেক্ষমাণ")}
                      {tracking.status === "in_transit" && t("In Transit", "ট্রানজিটে")}
                      {tracking.status === "out_for_delivery" && t("Out for Delivery", "ডেলিভারির জন্য বেরিয়েছে")}
                      {tracking.status === "delivered" && t("Delivered", "ডেলিভার হয়েছে")}
                    </p>
                  </div>
                  <Link href="/" className="text-muted hover:text-heading">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                </div>

                {/* Current Details */}
                <div className="grid sm:grid-cols-2 gap-4 border-t border-gray-100 dark:border-white/10 pt-6">
                  {tracking.current_location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted mb-0.5">{t("Current Location", "বর্তমান অবস্থান")}</p>
                        <p className="font-semibold text-heading">{tracking.current_location}</p>
                      </div>
                    </div>
                  )}
                  {tracking.estimated_delivery && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted mb-0.5">{t("Estimated Delivery", "আনুমানিক ডেলিভারি")}</p>
                        <p className="font-semibold text-heading">{tracking.estimated_delivery}</p>
                      </div>
                    </div>
                  )}
                  {tracking.rider_name && (
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted mb-0.5">{t("Rider", "ডেলিভারি বয়")}</p>
                        <p className="font-semibold text-heading">{tracking.rider_name}</p>
                      </div>
                    </div>
                  )}
                  {tracking.rider_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-muted mb-0.5">{t("Call Rider", "ডেলিভারি বয়কে ফোন করুন")}</p>
                        <a href={`tel:${tracking.rider_phone}`} className="font-semibold text-brand-600 hover:underline">
                          {tracking.rider_phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {tracking.events.length > 0 && (
                <div className="enterprise-card p-6">
                  <h3 className="font-bold text-lg text-heading mb-6">
                    {t("Delivery Timeline", "ডেলিভারি টাইমলাইন")}
                  </h3>
                  <div className="space-y-4">
                    {tracking.events.map((event, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-brand-600" />
                          {idx < tracking.events.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-200 dark:bg-white/10 my-1" />
                          )}
                        </div>
                        <div className="pb-4 pt-1">
                          <p className="font-semibold text-heading text-sm">{event.status}</p>
                          <p className="text-xs text-muted mt-0.5">{event.location}</p>
                          {event.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{event.notes}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.timestamp).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
