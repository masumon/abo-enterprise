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
  // On /cart the user is already in the cart — don't visually pull them back
  // to it. Only /checkout keeps the active highlight so the customer
  // knows the cart button will take them back to review.
  const cartActive = pathname.startsWith("/checkout");
  const showBadge = mounted && cartCount > 0;

  const renderTab = (item: { href: string; icon: typeof Home; label: { en: string; bn: string } }) => {
    const Icon = item.icon;
    const isActive = isItemActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "relative flex flex-col items-center justify-center gap-[3px] px-3",
          "rounded-[20px] transition-all duration-250",
          isActive
            ? "text-brand-700 dark:text-brand-200 bg-brand-50/70 dark:bg-brand-900/35 scale-[1.04]"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-white/[0.08] active:scale-95"
        )}
        aria-label={lang === "bn" ? item.label.bn : item.label.en}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon
          strokeWidth={isActive ? 2.4 : 2.3}
          className={cn(
            "w-[20px] h-[20px] transition-all duration-250",
            isActive ? "-translate-y-px" : ""
          )}
        />
        <span className={cn("text-[9px] font-medium leading-none", isActive && "font-semibold")}>
          {lang === "bn" ? item.label.bn : item.label.en}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 lg:hidden"
      style={{ bottom: "max(12px, calc(env(safe-area-inset-bottom, 0px) + 4px))" }}
      aria-label={lang === "bn" ? "মোবাইল নেভিগেশন" : "Mobile navigation"}
    >
      <div
        className={cn(
          "flex items-stretch",
          "h-[52px] px-1.5 gap-0.5",
          "rounded-[26px]",
          /* Match top navbar glassmorphism */
          "bg-white/72 dark:bg-[#0b1f3a]/82 backdrop-blur-2xl",
          "border border-white/60 dark:border-white/[0.09]",
          "shadow-[0_4px_20px_rgba(30,91,168,0.10),0_1px_3px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.82)]",
          "dark:shadow-[0_4px_24px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "transition-all duration-500",
        )}
      >
        {LEFT_ITEMS.map(renderTab)}

        {/* Center cart button */}
        <Link
          href="/cart"
          aria-label={lang === "bn" ? "কার্ট" : "Cart"}
          aria-current={cartActive ? "page" : undefined}
          className={cn(
            "relative flex flex-col items-center justify-center gap-[3px] px-3",
            "transition-all duration-250 active:scale-90",
            cartActive && "scale-105"
          )}
        >
          <span
            className={cn(
              "relative w-[38px] h-[38px] rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-brand-500 to-brand-700 text-white",
              "shadow-[0_4px_14px_rgba(30,91,168,0.42)]",
              "transition-all duration-250",
              cartActive
                ? "from-brand-600 to-brand-800 shadow-[0_6px_20px_rgba(30,91,168,0.58)] ring-2 ring-brand-200/70 dark:ring-brand-700/60"
                : ""
            )}
          >
            <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={2.5} />
            {showBadge && (
              <span
                className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#0b1f3a]"
                aria-label={lang === "bn" ? `কার্টে ${cartCount}টি পণ্য` : `${cartCount} items in cart`}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </span>
          <span
            className={cn(
              "text-[9px] font-medium transition-colors duration-200 leading-none",
              cartActive ? "text-brand-700 dark:text-brand-200 font-semibold" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {lang === "bn" ? "কার্ট" : "Cart"}
          </span>
        </Link>

        {RIGHT_ITEMS.map(renderTab)}
      </div>
    </nav>
  );
}
