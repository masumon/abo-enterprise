"use client";

import { useEffect, useState } from "react";
import { useLanguageStore } from "@/store/language";
import { Star, Package, MessageCircle, ShoppingCart } from "lucide-react";
import { publicApi } from "@/lib/api";

interface ReviewStatsCardProps {
  /** Optional overrides — when omitted, real figures are fetched from
   * /api/v1/public/stats instead of showing placeholder numbers. */
  averageRating?: number | null;
  totalReviews?: number;
  totalOrders?: number;
  totalProducts?: number;
}

export default function ReviewStatsCard({
  averageRating: averageRatingProp,
  totalReviews: totalReviewsProp,
  totalOrders: totalOrdersProp,
  totalProducts: totalProductsProp,
}: ReviewStatsCardProps) {
  const { lang } = useLanguageStore();
  const [fetched, setFetched] = useState<{
    average_rating: number | null;
    reviews: number;
    orders: number;
    products: number;
  } | null>(null);

  useEffect(() => {
    if (
      averageRatingProp !== undefined &&
      totalReviewsProp !== undefined &&
      totalOrdersProp !== undefined &&
      totalProductsProp !== undefined
    ) {
      return; // Fully overridden by caller — no fetch needed.
    }
    publicApi.stats().then((r) => {
      const d = r.data.data;
      if (!d) return;
      setFetched({
        average_rating: d.average_rating,
        reviews: d.reviews,
        orders: d.orders,
        products: d.products,
      });
    }).catch(() => {});
  }, [averageRatingProp, totalReviewsProp, totalOrdersProp, totalProductsProp]);

  const averageRating = averageRatingProp ?? fetched?.average_rating ?? null;
  const totalReviews = totalReviewsProp ?? fetched?.reviews ?? 0;
  const totalOrders = totalOrdersProp ?? fetched?.orders ?? 0;
  const totalProducts = totalProductsProp ?? fetched?.products ?? 0;

  const stats = [
    averageRating != null && {
      icon: Star,
      label: lang === "bn" ? "গড় রেটিং" : "Average Rating",
      value: averageRating.toFixed(1),
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-500/10",
    },
    {
      icon: ShoppingCart,
      label: lang === "bn" ? "সম্পন্ন অর্ডার" : "Orders Completed",
      value: totalOrders.toLocaleString(),
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      icon: Package,
      label: lang === "bn" ? "মোট পণ্য" : "Total Products",
      value: totalProducts.toLocaleString(),
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-500/10",
    },
    {
      icon: MessageCircle,
      label: lang === "bn" ? "মোট রিভিউ" : "Total Reviews",
      value: totalReviews.toLocaleString(),
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-500/10",
    },
  ].filter(Boolean) as { icon: typeof Star; label: string; value: string; color: string; bgColor: string }[];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-transparent p-4 sm:p-8">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-6">
        {stats.map(({ icon: Icon, label, value, color, bgColor }, idx) => (
          <div key={idx} className="flex flex-col items-center text-center">
            <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-full ${bgColor} flex items-center justify-center mb-1.5 sm:mb-3`}>
              <Icon className={`w-4 h-4 sm:w-7 sm:h-7 ${color}`} aria-hidden />
            </div>
            <p className="text-xs sm:text-2xl font-bold text-heading mb-0.5 sm:mb-1">
              {value}
            </p>
            <p className="text-[9px] sm:text-sm text-[var(--ink-muted)] leading-tight">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
