"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, ShoppingCart, Wrench, Package, User } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCustomerStore } from "@/store/customer";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const isLoggedIn = useCustomerStore((s) => s.isLoggedIn());
  const cartCount = useCartStore((s) => s.itemCount());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    useCustomerStore.persist.rehydrate();
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  const profileHref = isLoggedIn ? "/profile" : "/track";
  const profileLabel = isLoggedIn
    ? { en: "Profile", bn: "প্রোফাইল" }
    : { en: "Track", bn: "ট্র্যাক" };
  const ProfileIcon = isLoggedIn ? User : Package;

  const LEFT_ITEMS = [
    { href: "/", icon: Home, label: { en: "Home", bn: "হোম" } },
    { href: "/products", icon: Store, label: { en: "Shop", bn: "শপ" } },
  ];
  const RIGHT_ITEMS = [
    { href: "/services", icon: Wrench, label: { en: "Services", bn: "সেবা" } },
    { href: profileHref, icon: ProfileIcon, label: profileLabel },
  ];

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const cartActive = pathname.startsWith("/cart") || pathname.startsWith("/checkout");
  const showBadge = mounted && cartCount > 0;

  const renderTab = (item: { href: string; icon: typeof Home; label: { en: string; bn: string } }) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors duration-200",
          isActive
            ? "text-brand-700 dark:text-brand-200"
            : "text-gray-500 dark:text-gray-400 active:text-brand-600"
        )}
        aria-label={lang === "bn" ? item.label.bn : item.label.en}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Active indicator bar */}
        <span
          className={cn(
            "absolute top-0 h-[3px] rounded-b-full bg-brand-600 dark:bg-brand-400 transition-all duration-300",
            isActive ? "w-8 opacity-100" : "w-0 opacity-0"
          )}
        />
        <Icon
          strokeWidth={isActive ? 2.4 : 1.8}
          className={cn(
            "w-[22px] h-[22px] transition-all duration-200",
            isActive ? "-translate-y-px" : ""
          )}
        />
        <span className={cn(isActive ? "font-bold" : "")}>
          {lang === "bn" ? item.label.bn : item.label.en}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-gray-100/80 dark:border-white/10 bg-white/95 dark:bg-[#0f1a2e]/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,91,168,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
      aria-label={lang === "bn" ? "মোবাইল নেভিগেশন" : "Mobile navigation"}
    >
      <div className="grid grid-cols-5 h-16">
        {LEFT_ITEMS.map(renderTab)}

        {/* Center cart button — stays inside the bar so it never overlaps
            sticky CTAs (product add-to-cart, checkout order bar) above it */}
        <Link
          href="/cart"
          aria-label={lang === "bn" ? "কার্ট" : "Cart"}
          aria-current={cartActive ? "page" : undefined}
          className="flex flex-col items-center justify-center gap-0.5"
        >
          <span
            className={cn(
              "relative w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-200",
              "bg-gradient-to-br from-brand-500 to-brand-700 text-white",
              "shadow-md shadow-brand-600/30",
              cartActive ? "from-brand-600 to-brand-800 scale-105 ring-2 ring-brand-200 dark:ring-brand-800" : "active:scale-95"
            )}
          >
            <ShoppingCart className="w-5 h-5" strokeWidth={2.2} />
            {showBadge && (
              <span
                className="absolute -top-1 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0f1a2e]"
                aria-label={lang === "bn" ? `কার্টে ${cartCount}টি পণ্য` : `${cartCount} items in cart`}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium transition-colors duration-200",
              cartActive ? "text-brand-700 dark:text-brand-200 font-bold" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {lang === "bn" ? "কার্ট" : "Cart"}
          </span>
        </Link>

        {RIGHT_ITEMS.map(renderTab)}
      </div>
      <div className="h-safe-bottom min-h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
