"use client";

import Link from "next/link";
import { useLanguageStore } from "@/store/language";
import { Crown, Zap, FileText, Star, HelpCircle, Phone, Check, Truck } from "lucide-react";
import AutoScrollRow from "@/components/ui/AutoScrollRow";

const FEATURES = [
  {
    id: "award",
    icon: Crown,
    label: { en: "Awards", bn: "অ্যাওয়ার্ড" },
    color: "text-accent-500",
    href: "/about",
  },
  {
    id: "flash",
    icon: Zap,
    label: { en: "Flash Sale", bn: "ফ্ল্যাশ সেল" },
    color: "text-accent-600",
    href: "#flash-sale",
  },
  {
    id: "tracking",
    icon: FileText,
    label: { en: "Order Tracking", bn: "অর্ডার ট্র্যাক" },
    color: "text-brand-500",
    href: "/track",
  },
  {
    id: "reviews",
    icon: Star,
    label: { en: "Reviews", bn: "রিভিউ" },
    color: "text-accent-400",
    href: "#reviews",
  },
  {
    id: "support",
    icon: HelpCircle,
    label: { en: "Support", bn: "সাপোর্ট" },
    color: "text-accent-600",
    href: "/faq",
  },
  {
    id: "contact",
    icon: Phone,
    label: { en: "Contact", bn: "যোগাযোগ" },
    color: "text-brand-600 dark:text-brand-300",
    href: "#contact",
  },
  {
    id: "warranty",
    icon: Check,
    label: { en: "Warranty", bn: "ওয়ারেন্টি" },
    color: "text-brand-500",
    href: "/contact",
  },
  {
    id: "delivery",
    icon: Truck,
    label: { en: "Free Delivery", bn: "ফ্রি ডেলিভারি" },
    color: "text-brand-600",
    href: "/shipping",
  },
];

export default function FeatureIconsRow() {
  const { lang } = useLanguageStore();

  return (
    <section className="py-3 sm:py-4 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <AutoScrollRow
          items={FEATURES}
          keyExtractor={(f) => f.id}
          spaceBetween={8}
          renderItem={({ icon: Icon, label, color, href }) => (
            <Link
              href={href}
              className="flex flex-col items-center justify-center gap-1.5 py-1.5 sm:py-3 px-3 sm:px-5 w-20 sm:w-24 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group touch-manipulation"
            >
              <Icon className={`w-6 sm:w-8 h-6 sm:h-8 ${color} group-hover:scale-110 transition-transform`} aria-hidden />
              <span className="text-[9px] sm:text-xs font-semibold text-center text-heading leading-tight">
                {lang === "bn" ? label.bn : label.en}
              </span>
            </Link>
          )}
        />
      </div>
    </section>
  );
}
