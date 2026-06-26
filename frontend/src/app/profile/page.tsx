"use client";

import Link from "next/link";
import {
  Package, Calendar, Heart, FileText, MapPin, Headphones, Settings, LogOut,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useWishlistStore } from "@/store/wishlist";
import GlassCard from "@/components/ui/GlassCard";

const PORTAL_ITEMS = [
  { href: "/orders", icon: Package, labelKey: "profile_orders" as const, live: true },
  { href: "/services", icon: Calendar, labelKey: "profile_bookings" as const, live: true },
  { href: "/profile/wishlist", icon: Heart, labelKey: "profile_wishlist" as const, live: true },
  { href: "/profile", icon: FileText, labelKey: "profile_invoices" as const, live: false },
  { href: "/profile", icon: MapPin, labelKey: "profile_addresses" as const, live: false },
  { href: "/contact", icon: Headphones, labelKey: "profile_support" as const, live: true },
  { href: "/profile", icon: Settings, labelKey: "profile_settings" as const, live: false },
];

export default function ProfilePage() {
  const { lang } = useLanguageStore();
  const t = useT();
  const wishlistCount = useWishlistStore((s) => s.count());

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <GlassCard className="p-6 text-center mb-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">👤</div>
          <h1 className="text-2xl font-bold">{t("profile_dashboard")}</h1>
          <p className="text-white/70 text-sm mt-1">
            {lang === "bn" ? "ABO Enterprise ক্লায়েন্ট পোর্টাল" : "ABO Enterprise Client Portal"}
          </p>
        </GlassCard>

        <div className="grid sm:grid-cols-2 gap-3">
          {PORTAL_ITEMS.map((item) => {
            const Icon = item.icon;
            const badge = item.labelKey === "profile_wishlist" && wishlistCount > 0 ? wishlistCount : null;
            return (
              <Link key={item.labelKey} href={item.href}>
                <GlassCard hover className="p-4 flex items-center gap-4 h-full">
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{t(item.labelKey)}</p>
                    {!item.live && (
                      <p className="text-[10px] text-accent-500 font-medium">{t("profile_coming_soon")}</p>
                    )}
                  </div>
                  {badge && (
                    <span className="w-6 h-6 bg-accent-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{badge}</span>
                  )}
                </GlassCard>
              </Link>
            );
          })}
        </div>

        <Link href="/admin/login" className="mt-6 flex items-center justify-center gap-2 w-full py-3 border border-brand-200 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-50 glass">
          <LogOut className="w-4 h-4 rotate-180" />
          {lang === "bn" ? "এডমিন লগইন" : "Admin Login"}
        </Link>
      </div>
    </div>
  );
}
