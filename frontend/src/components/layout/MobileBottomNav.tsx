"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, Calendar, Package, User } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCustomerStore } from "@/store/customer";
import { cn } from "@/lib/utils";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const isLoggedIn = useCustomerStore((s) => s.isLoggedIn());

  useEffect(() => {
    useCustomerStore.persist.rehydrate();
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  const profileHref = isLoggedIn ? "/profile" : "/track";
  const profileLabel = isLoggedIn
    ? { en: "Profile", bn: "প্রোফাইল" }
    : { en: "Track", bn: "ট্র্যাক" };
  const ProfileIcon = isLoggedIn ? User : Package;

  const NAV_ITEMS = [
    { href: "/", icon: Home, label: { en: "Home", bn: "হোম" } },
    { href: "/search", icon: Search, label: { en: "Search", bn: "খুঁজুন" } },
    { href: "/products", icon: ShoppingBag, label: { en: "Shop", bn: "শপ" } },
    { href: "/services", icon: Calendar, label: { en: "Book", bn: "বুক" } },
    { href: profileHref, icon: ProfileIcon, label: profileLabel },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-gray-100/80 dark:border-white/10 bg-white/95 dark:bg-[#0f1a2e]/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,91,168,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
      aria-label={lang === "bn" ? "মোবাইল নেভিগেশন" : "Mobile navigation"}
    >
      <div className="grid grid-cols-5 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all duration-200",
                isActive ? "text-brand-600 dark:text-brand-300" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
              aria-label={lang === "bn" ? item.label.bn : item.label.en}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={cn(
                "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200",
                isActive ? "bg-brand-50 dark:bg-brand-900/40 shadow-sm shadow-brand-100 dark:shadow-none" : ""
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-200",
                  isActive ? "text-brand-600 dark:text-brand-300 scale-110" : "text-gray-400 dark:text-gray-500"
                )} />
              </span>
              <span className={cn("transition-colors duration-200", isActive ? "text-brand-600 dark:text-brand-300 font-semibold" : "")}>
                {lang === "bn" ? item.label.bn : item.label.en}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-bottom min-h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}
