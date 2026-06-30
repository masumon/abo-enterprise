"use client";

import Link from "next/link";
import {
  Package, Calendar, Heart, FileText, MapPin, Headphones, Settings, Search,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useWishlistStore } from "@/store/wishlist";
import GlassCard from "@/components/ui/GlassCard";
import PageHero from "@/components/ui/PageHero";
import { useCustomerStore } from "@/store/customer";

const PORTAL_ITEMS = [
  { href: "/orders", icon: Package, labelKey: "profile_orders" as const, live: true },
  { href: "/track", icon: Search, labelKey: "nav_track" as const, live: true },
  { href: "/book", icon: Calendar, labelKey: "profile_bookings" as const, live: true },
  { href: "/profile/wishlist", icon: Heart, labelKey: "profile_wishlist" as const, live: true },
  { href: "/profile/invoices", icon: FileText, labelKey: "profile_invoices" as const, live: true },
  { href: "/profile/addresses", icon: MapPin, labelKey: "profile_addresses" as const, live: true },
  { href: "/contact", icon: Headphones, labelKey: "profile_support" as const, live: true },
  { href: "/profile/settings", icon: Settings, labelKey: "profile_settings" as const, live: true },
];

export default function ProfilePage() {
  const { lang } = useLanguageStore();
  const t = useT();
  const { session } = useCustomerStore();
  const wishlistCount = useWishlistStore((s) => s.count());

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="profile"
        title={t("profile_dashboard")}
        subtitle={lang === "bn" ? "ABO Enterprise ক্লায়েন্ট পোর্টাল" : "ABO Enterprise Client Portal"}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard" },
        ]}
        variant="light"
      />
      <div className="container mx-auto px-4 max-w-2xl py-8">
        <GlassCard className="p-5 text-center mb-6">
          <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">👤</div>
          <p className="font-semibold text-heading">{session?.name ?? (lang === "bn" ? "গ্রাহক" : "Customer")}</p>
          {session?.phone && <p className="text-sm text-muted mt-1">{session.phone}</p>}
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
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{t(item.labelKey)}</p>
                  </div>
                  {badge && (
                    <span className="w-6 h-6 bg-accent-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{badge}</span>
                  )}
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
