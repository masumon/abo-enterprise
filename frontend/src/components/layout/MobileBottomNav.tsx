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
// One calm system in both themes: idle tabs are neutral (no filled pill), and
// only the ACTIVE tab lights up — a single brand-navy pill that lifts. Gold is
// kept for meaning (the cart badge, the search "new" dot), never as a per-tab
// background, so the active tab is unmistakable and the bar reads as one piece
// with the rest of the site. Explicit class strings so Tailwind keeps them.
const IDLE_ICON = "text-slate-500 dark:text-slate-400";
const ACTIVE_ICON = "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-500/30 -translate-y-0.5";
const IDLE_LABEL = "text-slate-500 dark:text-slate-400 font-medium";
const ACTIVE_LABEL = "text-brand-700 dark:text-brand-200 font-bold";

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
        className="fixed inset-x-0 bottom-0 z-50 lg:hidden grid grid-cols-5 bg-white/85 dark:bg-[var(--surface-card)]/85 backdrop-blur-xl border-t border-[var(--line)] shadow-[0_-4px_16px_rgba(20,24,43,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={lang === "bn" ? "মোবাইল নেভিগেশন" : "Mobile navigation"}
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition-colors",
                active ? ACTIVE_LABEL : IDLE_LABEL
              )}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center w-10 h-8 rounded-full transition-all",
                  active ? ACTIVE_ICON : IDLE_ICON
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
            moreOpen ? ACTIVE_LABEL : IDLE_LABEL
          )}
        >
          <span
            className={cn(
              "flex items-center justify-center w-10 h-8 rounded-full transition-all",
              moreOpen ? ACTIVE_ICON : IDLE_ICON
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
