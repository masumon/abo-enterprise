"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, ChevronRight, X, Store, GitCompare, Heart, Wrench, Calendar,
  Package, User, LogIn, MessageCircle, Phone, Globe, ChevronRight as Arrow,
} from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useCustomerStore } from "@/store/customer";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { cn, WHATSAPP_NUMBER } from "@/lib/utils";
import BrandLogo from "@/components/ui/BrandLogo";

/**
 * The More drawer from screen 03. Four groups, fixed in both signed-in and
 * signed-out states — only what is inside them changes. The tab that opens it
 * therefore never changes identity mid-session, which is what the old
 * Track/Profile tab did.
 *
 * Track an order is the only marigold row: one primary action per screen, and
 * on this screen that is the thing a customer with no account can still do.
 *
 * Counts come from stores that already hold them. Nothing here claims a number
 * it would have to fetch to know — the system's rule is that what can be
 * counted may not be claimed.
 */
interface Row {
  href: string;
  icon?: typeof Store;
  label: { en: string; bn: string };
  meta?: { en: string; bn: string } | null;
  gold?: boolean;
}

export default function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang, toggle: toggleLang } = useLanguageStore();
  const router = useRouter();
  const isLoggedIn = useCustomerStore((s) => s.isLoggedIn());
  const customerName = useCustomerStore((s) => s.session?.name);
  const wishlistCount = useWishlistStore((s) => s.count());
  const compareCount = useCompareStore((s) => s.items.length);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes, and the page behind must not scroll while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  const groups: { title: { en: string; bn: string }; rows: Row[] }[] = [
    {
      title: { en: "Shop", bn: "শপ" },
      rows: [
        { href: "/products", icon: Store, label: { en: "All products", bn: "সব পণ্য" } },
        {
          href: "/compare",
          icon: GitCompare,
          label: { en: "Compare", bn: "তুলনা" },
          meta: compareCount > 0 ? { en: `${compareCount} selected`, bn: `${compareCount}টি নির্বাচিত` } : null,
        },
        {
          href: "/profile/wishlist",
          icon: Heart,
          label: { en: "Wishlist", bn: "উইশলিস্ট" },
          meta: wishlistCount > 0 ? { en: `${wishlistCount} saved`, bn: `${wishlistCount}টি সংরক্ষিত` } : null,
        },
      ],
    },
    {
      title: { en: "Services", bn: "সেবা" },
      rows: [
        { href: "/services", icon: Wrench, label: { en: "All services", bn: "সব সেবা" } },
        { href: "/book", icon: Calendar, label: { en: "Book a service", bn: "সেবা বুক করুন" } },
      ],
    },
    {
      title: { en: "Orders", bn: "অর্ডার" },
      rows: [
        {
          href: "/track",
          icon: Package,
          label: { en: "Track an order", bn: "অর্ডার ট্র্যাক করুন" },
          meta: { en: "without signing in", bn: "সাইন ইন ছাড়াই" },
          gold: true,
        },
        isLoggedIn
          ? { href: "/profile", icon: User, label: { en: "My account", bn: "আমার অ্যাকাউন্ট" } }
          : { href: "/login", icon: LogIn, label: { en: "Sign in", bn: "সাইন ইন" } },
      ],
    },
    {
      // Each row is a real page at its own route — no more bundled "X · Y · Z"
      // labels that quietly routed to only one of the three named pages.
      title: { en: "Company", bn: "প্রতিষ্ঠান" },
      rows: [
        { href: "/projects", label: { en: "Projects", bn: "প্রজেক্ট" } },
        { href: "/gallery", label: { en: "Gallery", bn: "গ্যালারি" } },
        { href: "/blog", label: { en: "Blog", bn: "ব্লগ" } },
        { href: "/about", label: { en: "About", bn: "পরিচিতি" } },
        { href: "/career", label: { en: "Career", bn: "ক্যারিয়ার" } },
        { href: "/testimonials", label: { en: "Testimonials", bn: "রিভিউ" } },
        { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
        { href: "/shipping", label: { en: "Shipping", bn: "ডেলিভারি" } },
        { href: "/faq", label: { en: "FAQ", bn: "সাধারণ প্রশ্ন" } },
        { href: "/legal/terms", label: { en: "Legal", bn: "আইনি" } },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-[#14182b]/45"
        onClick={onClose}
        aria-label={t({ en: "Close menu", bn: "মেনু বন্ধ করুন" })}
      />
      <div
        ref={panelRef}
        className="absolute inset-y-0 left-0 h-full w-[85%] max-w-[340px] overflow-y-auto rounded-r-2xl bg-white dark:bg-[var(--surface-card)] shadow-2xl motion-safe:animate-slide-in-left flex flex-col"
      >
        {/* Brand header — gives the sheet an identity instead of a bare word. */}
        <div className="sticky top-0 z-10 flex items-center gap-2.5 px-4 py-3.5 gradient-brand">
          <BrandLogo size="sm" href={false} variant="light" />
          <div className="flex-1 min-w-0 leading-tight">
            <p className="font-bold text-white text-[15px] truncate">ABO Enterprise</p>
            <p className="text-white/70 text-[11px] truncate">{t({ en: "Simple Solutions", bn: "সহজ সমাধান" })}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t({ en: "Close", bn: "বন্ধ" })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account chip — signed-in identity, or a clear way in. */}
        <div className="px-4 pt-3">
          {isLoggedIn ? (
            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-100 dark:border-brand-500/25"
            >
              <span className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {(customerName || "A").charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-heading truncate">{customerName || t({ en: "My account", bn: "আমার অ্যাকাউন্ট" })}</span>
                <span className="block text-[11px] text-muted">{t({ en: "View account", bn: "অ্যাকাউন্ট দেখুন" })}</span>
              </span>
              <Arrow className="w-4 h-4 text-muted flex-shrink-0" aria-hidden />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" onClick={onClose} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-bold hover:bg-accent-600 transition-colors">
                <LogIn className="w-4 h-4" aria-hidden />
                {t({ en: "Sign in", bn: "সাইন ইন" })}
              </Link>
              <Link href="/track" onClick={onClose} className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-brand-200 dark:border-brand-500/30 text-brand-700 dark:text-brand-300 text-sm font-semibold">
                <Package className="w-4 h-4" aria-hidden />
                {t({ en: "Track", bn: "ট্র্যাক" })}
              </Link>
            </div>
          )}
        </div>

        <form
          className="relative px-4 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const q = query.trim();
            if (!q) return;
            onClose();
            router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
          role="search"
        >
          <Search aria-hidden className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
            placeholder={t({ en: "Search products & services…", bn: "পণ্য ও সেবা খুঁজুন…" })}
            aria-label={t({ en: "Search products and services", bn: "পণ্য ও সেবা খুঁজুন" })}
          />
        </form>

        {groups.map((group) => (
          <section key={group.title.en} className="px-4 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted mb-2">
              {t(group.title)}
            </p>
            <ul className="space-y-1.5">
              {group.rows.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.href + row.label.en}>
                    <Link
                      href={row.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-xl border transition-colors",
                        row.gold
                          ? "border-accent-300 bg-accent-50 dark:border-accent-500/40 dark:bg-accent-900/20"
                          : "border-transparent bg-gray-50 dark:bg-white/[0.04] hover:border-brand-200 dark:hover:border-brand-500/30"
                      )}
                    >
                      {Icon && (
                        <span
                          className={cn(
                            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                            row.gold ? "bg-accent-100 dark:bg-accent-500/20" : "bg-brand-50 dark:bg-brand-500/15"
                          )}
                        >
                          <Icon
                            aria-hidden
                            className={cn("w-4 h-4", row.gold ? "text-accent-700 dark:text-accent-300" : "text-brand-600 dark:text-brand-300")}
                          />
                        </span>
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-heading">{t(row.label)}</span>
                        {row.meta && <span className="block text-xs text-muted">{t(row.meta)}</span>}
                      </span>
                      <ChevronRight aria-hidden className="w-4 h-4 text-muted flex-shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {/* Footer — quick contact + language, with clearance above the bottom
            nav so the last list rows are no longer cut off underneath it. */}
        <div
          className="mt-4 border-t border-[var(--line)] px-4 pt-3"
          style={{ paddingBottom: "calc(var(--mobile-chrome-bottom, 16px) + 1rem)" }}
        >
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
            >
              <MessageCircle className="w-5 h-5" aria-hidden />
              <span className="text-[10px] font-semibold">WhatsApp</span>
            </a>
            <a
              href={`tel:+${WHATSAPP_NUMBER}`}
              onClick={onClose}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300"
            >
              <Phone className="w-5 h-5" aria-hidden />
              <span className="text-[10px] font-semibold">{t({ en: "Call", bn: "কল" })}</span>
            </a>
            <button
              type="button"
              onClick={toggleLang}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300"
              aria-label={t({ en: "Switch language", bn: "ভাষা বদলান" })}
            >
              <Globe className="w-5 h-5" aria-hidden />
              <span className="text-[10px] font-semibold">{lang === "bn" ? "English" : "বাংলা"}</span>
            </button>
          </div>
          <p className="text-center text-[10px] text-muted mt-3">
            © {new Date().getFullYear()} ABO Enterprise
          </p>
        </div>
      </div>
    </div>
  );
}
