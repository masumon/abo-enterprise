"use client";

import { useLanguageStore } from "@/store/language";
import { Crown, Zap, FileText, Star, HelpCircle, Phone, Check, Truck } from "lucide-react";

const FEATURES = [
  {
    id: "award",
    icon: Crown,
    label: { en: "Awards", bn: "অ্যাওয়ার্ড" },
    color: "text-yellow-500",
  },
  {
    id: "flash",
    icon: Zap,
    label: { en: "Flash Sale", bn: "ফ্ল্যাশ সেল" },
    color: "text-orange-500",
  },
  {
    id: "tracking",
    icon: FileText,
    label: { en: "Order Tracking", bn: "অর্ডার ট্র্যাক" },
    color: "text-blue-500",
  },
  {
    id: "reviews",
    icon: Star,
    label: { en: "Reviews", bn: "রিভিউ" },
    color: "text-yellow-400",
  },
  {
    id: "support",
    icon: HelpCircle,
    label: { en: "Support", bn: "সাপোর্ট" },
    color: "text-red-500",
  },
  {
    id: "contact",
    icon: Phone,
    label: { en: "Contact", bn: "যোগাযোগ" },
    color: "text-gray-600 dark:text-gray-400",
  },
  {
    id: "warranty",
    icon: Check,
    label: { en: "Warranty", bn: "ওয়ারেন্টি" },
    color: "text-green-500",
  },
  {
    id: "delivery",
    icon: Truck,
    label: { en: "Free Delivery", bn: "ফ্রি ডেলিভারি" },
    color: "text-blue-600",
  },
];

export default function FeatureIconsRow() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-6 sm:py-8 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-4">
          {FEATURES.map(({ id, icon: Icon, label, color }) => (
            <div
              key={id}
              className="flex flex-col items-center justify-center gap-1.5 py-2 sm:py-4 px-1 sm:px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <Icon className={`w-6 sm:w-8 h-6 sm:h-8 ${color} group-hover:scale-110 transition-transform`} aria-hidden />
              <span className="text-[9px] sm:text-xs font-semibold text-center text-heading leading-tight">
                {lang === "bn" ? label.bn : label.en}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
