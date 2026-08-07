"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, ShoppingCart, Search, Menu } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCustomerStore } from "@/store/customer";
import { useCartStore } from "@/store/cart";
import MoreDrawer from "@/components/layout/MoreDrawer";
import { cn } from "@/lib/utils";

/**
 * Screen 03 — the tab bar as the design system draws it: a flat surface with a
 * single hairline above it and five equal columns, Home · Shop · Search · Cart
 * · More.
 *
 * Two things this fixes beyond the styling. The fifth tab used to change
 * identity with the session — Track when signed out, Profile when signed in —
 * so the bar the visitor learned in one minute was a different bar the next.
 * More is fixed; only its contents change. And Search now has a permanent slot
 * (GAP-07): it replaced Services, not Cart, because Cart carries committed
 * intent and a live badge.
 */
// Per-tab colour, echoing the top bar's mixed brand + gold action chips so the
// two bars read as one system — each tab keeps its own tint (brand or gold),
// not a single uniform colour. The ACTIVE tab fills solid and lifts. Explicit
// class strings (no interpolation) so Tailwind keeps them.
const TAB_COLOR = {
  brand: {
    idle: "bg-brand-50 dark:bg-brand-500/15 ring-1 ring-brand-200/70 dark:ring-brand-400/25 text-brand-600 dark:text-brand-200",
    active: "bg-brand-600 text-white ring-1 ring-brand-700/40 shadow-md shadow-brand-500/25 -translate-y-0.5",
    labelIdle: "text-brand-600/90 dark:text-brand-200/90 font-medium",
    labelActive: "text-brand-700 dark:text-brand-200 font-bold",
  },
  accent: {
    idle: "bg-accent-50 dark:bg-accent-500/15 ring-1 ring-accent-200/70 dark:ring-accent-400/25 text-accent-600 dark:text-accent-300",
    active: "bg-accent-500 text-[#14182b] ring-1 ring-accent-600/40 shadow-md shadow-accent-500/25 -translate-y-0.5",
    labelIdle: "text-accent-700/90 dark:text-accent-300/90 font-medium",
    labelActive: "text-accent-700 dark:text-accent-200 font-bold",
  },
} as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();
  const cartCount = useCartStore((s) => s.itemCount());
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    useCustomerStore.persist.rehydrate();
    useCartStore.persist.rehydrate();
    setMounted(true);
  }, []);

  // Close the sheet on navigation, so a back gesture never leaves it stranded.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (pathname?.startsWith("/sumon")) return null;

  const TABS = [
    { href: "/", icon: Home, label: { en: "Home", bn: "হোম" }, tint: "brand" as const },
    { href: "/products", icon: Store, label: { en: "Shop", bn: "শপ" }, tint: "accent" as const },
    { href: "/search", icon: Search, label: { en: "Search", bn: "খুঁজুন" }, tint: "brand" as const },
    { href: "/cart", icon: ShoppingCart, label: { en: "Cart", bn: "কার্ট" }, tint: "accent" as const },
  ];

  const isItemActive = (href: string) => {
    // On /cart the customer is already in the cart — don't pull them back to
    // it. Only /checkout keeps the highlight, so they know the tab returns them
    // to review. (Unchanged from the previous bar; easy to lose in a rewrite.)
    if (href === "/cart") return pathname.startsWith("/checkout");
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  };

  const showBadge = mounted && cartCount > 0;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden grid grid-cols-5 bg-white/85 dark:bg-[#141930]/90 backdrop-blur-xl border-t border-[var(--line)] shadow-[0_-4px_16px_rgba(20,24,43,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={lang === "bn" ? "মোবাইল নেভিগেশন" : "Mobile navigation"}
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);
          const c = TAB_COLOR[item.tint];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                active ? c.labelActive : c.labelIdle
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center w-10 h-8 rounded-xl transition-all",
                  active ? c.active : c.idle
                )}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
                {item.href === "/search" && !active && (
                  <span className="absolute top-0 right-1.5 w-[6px] h-[6px] rounded-full bg-accent-500" aria-hidden />
                )}
                {item.href === "/cart" && showBadge && (
                  <span
                    className="absolute -top-1 right-0 min-w-[15px] h-[15px] px-0.5 rounded-full bg-accent-500 text-[#14182b] text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-[var(--surface-card)]"
                    aria-label={lang === "bn" ? `কার্টে ${cartCount}টি পণ্য` : `${cartCount} items in cart`}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="text-xs leading-none max-w-full truncate">
                {lang === "bn" ? item.label.bn : item.label.en}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          className={cn(
            "min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
            moreOpen ? TAB_COLOR.brand.labelActive : TAB_COLOR.brand.labelIdle
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center w-10 h-8 rounded-xl transition-all",
              moreOpen ? TAB_COLOR.brand.active : TAB_COLOR.brand.idle
            )}
          >
            <Menu className="w-[18px] h-[18px]" strokeWidth={moreOpen ? 2.5 : 2} />
          </span>
          <span className="text-xs leading-none">{lang === "bn" ? "আরও" : "More"}</span>
        </button>
      </nav>

      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
