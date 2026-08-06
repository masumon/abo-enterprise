"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart, X, Globe, Search, Briefcase, Moon, Sun, User, MessageCircle,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useThemeStore } from "@/store/theme";
import { useCustomerStore } from "@/store/customer";
import { useT } from "@/lib/i18n/useT";
import SearchSuggestions from "@/components/search/SearchSuggestions";
import MegaMenu from "@/components/layout/MegaMenu";
import BrandLogo from "@/components/ui/BrandLogo";
import { getBrandFullTitle, getBrandName, getBrandTagline } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { useAssistantStore } from "@/store/assistant";
import { hasBottomActionBar } from "@/lib/actionBarRoutes";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { ANNOUNCEMENT_VARIANT_BG } from "@/components/layout/AnnouncementBar";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const toggleAssistant = useAssistantStore((s) => s.toggle);
  const showAssistantInHeader = hasBottomActionBar(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT();

  const { itemCount } = useCartStore();
  const { lang, toggle } = useLanguageStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const customerSession = useCustomerStore((s) => s.session);
  const isSignedIn = Boolean(customerSession?.token);
  const count = itemCount();
  const productRoots = useTaxonomy("product");
  const serviceRoots = useTaxonomy("service");
  const searchListId = "site-search-suggestions";
  const { announcements, shouldShow: showTicker, durationSec } = useAnnouncements();
  const tickerTrack = showTicker ? [...announcements, ...announcements] : [];

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="fixed top-[var(--announcement-height)] left-0 right-0 z-50">
      {/* ── Mobile header — artifact Screen 03 m-head ── */}
      <nav
        className="lg:hidden flex items-center gap-2.5 px-3.5 min-h-[68px] bg-white/85 dark:bg-[var(--surface-card)]/85 backdrop-blur-xl border-b border-[var(--line)] dark:border-[var(--line)] shadow-sm"
        aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}
      >
        <Link href="/" className="flex-none flex items-center" aria-label={getBrandName(lang)}>
          <BrandLogo size="sm" href={false} priority />
        </Link>

        {showTicker ? (
          <div
            className={cn(
              "marquee-viewport flex-1 min-w-0 mx-1.5 h-8 rounded-full px-3 shadow-sm",
              ANNOUNCEMENT_VARIANT_BG[announcements[0]?.variant ?? "promo"] ?? ANNOUNCEMENT_VARIANT_BG.promo
            )}
          >
            <div
              className="marquee-track items-center h-8"
              style={{ ["--marquee-duration" as string]: `${durationSec}s` }}
            >
              {tickerTrack.map((a, i) => (
                <Link
                  key={i}
                  href={a.href || "/"}
                  aria-hidden={i >= announcements.length}
                  tabIndex={i >= announcements.length ? -1 : 0}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-white pr-6 whitespace-nowrap"
                >
                  {a.icon && <span aria-hidden>{a.icon}</span>}
                  <span>{lang === "bn" ? a.bn : a.en}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <span className="flex-1" />
        )}

        {showAssistantInHeader && (
          <button
            type="button"
            onClick={toggleAssistant}
            className="w-9 h-9 rounded-lg border border-[var(--line)] flex items-center justify-center text-xs text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30"
            aria-label={lang === "bn" ? "সহায়ক চ্যাট" : "Assistant chat"}
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg border border-[var(--line)] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-[var(--ink-muted)] hover:text-accent-600 dark:hover:text-accent-400 hover:border-accent-200 dark:hover:border-accent-500/30 transition-colors flex-none"
          aria-label={lang === "bn" ? "ডার্ক/লাইট মোড পরিবর্তন করুন" : "Toggle dark mode"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
        </button>

        <button
          type="button"
          onClick={toggle}
          className="font-mono text-xs font-semibold tracking-[0.06em] px-2.5 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 flex-none"
          aria-label={lang === "en" ? "বাং — Switch to Bangla" : "EN — Switch to English"}
        >
          {lang === "en" ? "বাং" : "EN"}
        </button>

        <Link
          href="/login"
          className="w-9 h-9 rounded-lg border border-[var(--line)] bg-gray-50 dark:bg-white/5 flex items-center justify-center text-xs text-[var(--ink-muted)] hover:text-brand-600 dark:hover:text-brand-300 hover:border-brand-200 dark:hover:border-brand-500/30 transition-colors"
          aria-label={lang === "bn" ? "গ্রাহক লগইন" : "Customer login"}
        >
          <User className="w-4 h-4" strokeWidth={2} />
        </Link>
      </nav>

      {/* ── Desktop floating capsule ── */}
      <div className="hidden lg:flex justify-center pt-2 px-4">
        <nav
          className={cn(
            "w-full flex items-center justify-between gap-3 px-5",
            "h-[4.5rem] rounded-full",
            "bg-white/72 dark:bg-[#0b1f3a]/82 backdrop-blur-2xl",
            "border border-white/60 dark:border-white/[0.09]",
            "shadow-[0_4px_20px_rgba(30,43,107,0.10),0_1px_3px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.82)]",
            "dark:shadow-[0_4px_24px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)]",
            "transition-all duration-500",
            isScrolled && [
              "bg-white/84 dark:bg-[#0b1f3a]/92",
              "shadow-[0_8px_32px_rgba(30,43,107,0.16),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]",
              "dark:shadow-[0_8px_40px_rgba(0,0,0,0.52),0_0_0_1px_rgba(59,130,246,0.10),inset_0_1px_0_rgba(255,255,255,0.07)]",
            ],
            "max-w-7xl"
          )}
          aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}
        >
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <BrandLogo size="md" href={false} priority />
            <span className="min-w-0">
              <span className="font-bold text-xl tracking-tight block text-brand-800 dark:text-white truncate">
                {getBrandName(lang)}
              </span>
              <p className="text-xs font-medium text-brand-600/90 dark:text-brand-200/80 truncate max-w-[15rem] leading-snug">
                {getBrandTagline(lang)}
              </p>
            </span>
          </Link>

          <MegaMenu />

          <div className="flex items-center gap-1 flex-shrink-0">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center relative">
                <div className="relative">
                  <input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("nav_search") + "..."}
                    role="combobox"
                    aria-expanded={searchQuery.trim().length >= 2}
                    aria-controls={searchListId}
                    aria-autocomplete="list"
                    className="w-56 px-3 py-1.5 pr-8 rounded-xl text-sm input"
                  />
                  <button type="submit" aria-label="Submit search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600">
                    <Search className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <SearchSuggestions listboxId={searchListId} query={searchQuery} onSelect={() => { setSearchOpen(false); setSearchQuery(""); }} />
                </div>
                <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}
                  className="ml-1 w-11 h-11 flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-all duration-200 touch-manipulation">
                  <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setSearchOpen(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-brand-50/80 dark:hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation"
                aria-label={t("nav_search")}>
                <Search className="w-5 h-5" strokeWidth={2.5} />
              </button>
            )}

            <button type="button" onClick={toggleTheme}
              className={cn(
                "w-11 h-11 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-brand-50/80 dark:hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation",
                searchOpen && "hidden"
              )}
              aria-label="Toggle dark mode">
              {theme === "dark" ? <Sun className="w-[19px] h-[19px]" strokeWidth={2.5} /> : <Moon className="w-[19px] h-[19px]" strokeWidth={2.5} />}
            </button>

            <button type="button" onClick={toggle}
              className={cn(
                "flex items-center gap-1 px-3 h-11 rounded-full text-xs font-semibold border border-brand-200/80 text-brand-700 hover:bg-brand-50/80 hover:scale-105 active:scale-95 transition-all duration-200 dark:border-brand-700/70 dark:text-brand-300 touch-manipulation",
                searchOpen && "hidden"
              )}
              aria-label={lang === "en" ? "বাং — Switch to Bangla" : "EN — Switch to English"}>
              <Globe className="w-3.5 h-3.5" strokeWidth={2.5} />
              {lang === "en" ? "বাং" : "EN"}
            </button>

            {/* GAP-26 — Account icon is session-aware: signed in → profile, else → login */}
            <Link
              href={isSignedIn ? "/profile" : "/login"}
              aria-label={isSignedIn ? (lang === "bn" ? "আমার প্রোফাইল" : "My profile") : (lang === "bn" ? "গ্রাহক লগইন" : "Customer login")}
              title={isSignedIn ? (lang === "bn" ? "আমার প্রোফাইল" : "My profile") : (lang === "bn" ? "গ্রাহক লগইন" : "Customer login")}
              className={cn(
                "w-11 h-11 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-brand-50/80 dark:hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200 touch-manipulation",
                searchOpen && "hidden"
              )}
            >
              <User className={cn("w-[19px] h-[19px]", isSignedIn && "fill-current")} strokeWidth={2.5} />
            </Link>

            <Link
              href="/cart"
              className="relative w-11 h-11 flex items-center justify-center rounded-full bg-brand-600 text-white hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all duration-200 shadow-md shadow-brand-500/25"
              aria-label={`${t("nav_cart")} (${count})`}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={2.5} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-[17px] h-[17px] bg-accent-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-1 ring-white/80 dark:ring-[#0b1f3a]/80">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>

            <Link href="/projects" className="hidden md:inline-flex btn btn-primary btn-sm btn-ripple">
              <Briefcase className="w-4 h-4" strokeWidth={2.5} />
              {t("nav_get_quote")}
            </Link>

          </div>
        </nav>
      </div>

    </header>
  );
}
