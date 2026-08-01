"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, Calendar, Heart, FileText, MapPin, Headphones, Settings, Search, LogOut,
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
  const router = useRouter();
  const { lang } = useLanguageStore();
  const t = useT();
  const { session, logout } = useCustomerStore();
  const wishlistCount = useWishlistStore((s) => s.count());
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = () => {
    logout();
    router.push("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSignOutConfirm(false);
    }
  };

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
        {/* GAP-22 — signed out, the portal showed a generic "Customer" avatar
            and no prompt, so the visitor's next action was a tile tap that hit
            a gate they were given no warning about. The destinations gate
            themselves server-side and that is unchanged; this is a prompt, not
            a client-side auth gate, and every tile stays reachable. */}
        {session?.token ? (
          <>
            <GlassCard className="p-5 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 rounded-full flex items-center justify-center flex-shrink-0 text-2xl">👤</div>
                <div className="flex-1">
                  <p className="font-semibold text-heading">{session?.name ?? (lang === "bn" ? "গ্রাহক" : "Customer")}</p>
                  {session?.phone && <p className="text-sm text-muted mt-1">{session.phone}</p>}
                </div>
              </div>
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="btn btn-outline btn-sm w-full flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {lang === "bn" ? "সাইন আউট" : "Sign Out"}
              </button>
            </GlassCard>

            {showSignOutConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="signout-modal-title" onKeyDown={handleKeyDown}>
                <GlassCard className="p-6 max-w-sm">
                  <h3 id="signout-modal-title" className="font-bold text-heading mb-2">
                    {lang === "bn" ? "সাইন আউট করবেন?" : "Sign out?"}
                  </h3>
                  <p className="text-sm text-muted mb-4">
                    {lang === "bn"
                      ? "আপনি চলে যাবেন এবং আপনার অ্যাকাউন্ট অ্যাক্সেস হারাবেন। পরে আবার সাইন ইন করতে পারবেন।"
                      : "You'll be signed out and lose access to your account. You can sign back in anytime."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSignOutConfirm(false)}
                      className="btn btn-outline btn-sm flex-1"
                    >
                      {lang === "bn" ? "বাতিল" : "Cancel"}
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="btn btn-error btn-sm flex-1"
                    >
                      {lang === "bn" ? "সাইন আউট" : "Sign Out"}
                    </button>
                  </div>
                </GlassCard>
              </div>
            )}
          </>
        ) : (
          <GlassCard className="p-5 mb-6">
            <p className="font-semibold text-heading mb-1">
              {lang === "bn" ? "সাইন ইন করে অর্ডার দেখুন" : "Sign in to see your orders"}
            </p>
            <p className="text-sm text-muted mb-4">
              {lang === "bn"
                ? "ফোন ও ইমেইল দিন — কোডটি ইমেইলে যাবে। পাসওয়ার্ড লাগবে না।"
                : "Your phone and email — the code arrives by email. No password needed."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/login?redirect=/profile" className="btn btn-brand btn-sm">
                {lang === "bn" ? "সাইন ইন" : "Sign in"}
              </Link>
              <Link href="/track" className="btn btn-outline btn-sm">
                {lang === "bn" ? "সাইন ইন ছাড়াই ট্র্যাক করুন" : "Track without signing in"}
              </Link>
            </div>
          </GlassCard>
        )}

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
