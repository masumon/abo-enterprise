"use client";

import { useLanguageStore } from "@/store/language";
import { Star, Users, Package, MessageCircle, TrendingUp } from "lucide-react";

interface ReviewStatsCardProps {
  averageRating?: number;
  totalReviews?: number;
  totalBuyers?: number;
  totalProducts?: number;
  satisfactionRate?: number;
}

export default function ReviewStatsCard({
  averageRating = 4.8,
  totalReviews = 2847,
  totalBuyers = 10000,
  totalProducts = 25000,
  satisfactionRate = 99.2,
}: ReviewStatsCardProps) {
  const { lang } = useLanguageStore();

  const stats = [
    {
      icon: Star,
      label: lang === "bn" ? "গড় রেটিং" : "Average Rating",
      value: averageRating.toFixed(1),
      color: "text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-500/10",
    },
    {
      icon: Users,
      label: lang === "bn" ? "যাচাইকৃত ক্রেতা" : "Verified Buyers",
      value: `${(totalBuyers / 1000).toFixed(0)}K+`,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      icon: Package,
      label: lang === "bn" ? "মোট পণ্য" : "Total Products",
      value: `${(totalProducts / 1000).toFixed(0)}K+`,
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
    {
      icon: TrendingUp,
      label: lang === "bn" ? "সন্তুষ্টির হার" : "Satisfaction Rate",
      value: `${satisfactionRate}%`,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-500/10",
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-white/5 dark:to-transparent p-6 sm:p-8">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
        {stats.map(({ icon: Icon, label, value, color, bgColor }, idx) => (
          <div key={idx} className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${bgColor} flex items-center justify-center mb-3`}>
              <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${color}`} aria-hidden />
            </div>
            <p className="text-xl sm:text-2xl font-bold text-heading mb-1">
              {value}
            </p>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
