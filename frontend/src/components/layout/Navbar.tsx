"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Menu, X, Globe, Search, Briefcase, Moon, Sun, ChevronDown,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useThemeStore } from "@/store/theme";
import { useT } from "@/lib/i18n/useT";
import SearchSuggestions from "@/components/search/SearchSuggestions";
import MegaMenu from "@/components/layout/MegaMenu";
import BrandLogo from "@/components/ui/BrandLogo";
import { getBrandFullTitle, getBrandName, getBrandTagline } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const MOBILE_LINKS = [
  { href: "/blog", key: "nav_blog" as const },
  { href: "/projects", key: "nav_solutions" as const },
  { href: "/about", key: "nav_about" as const },
  { href: "/contact", key: "nav_contact" as const },
];

const MOBILE_PRODUCT_LINKS = [
  { href: "/products", label: { en: "All Products", bn: "সব পণ্য" } },
  { href: "/products?category=accessories", label: { en: "Accessories", bn: "এক্সেসরিজ" } },
  { href: "/products?category=gadgets", label: { en: "Gadgets", bn: "গ্যাজেট" } },
  { href: "/products?category=electronics", label: { en: "Electronics", bn: "ইলেকট্রনিক্স" } },
  { href: "/profile/wishlist", label: { en: "Wishlist", bn: "উইশলিস্ট" } },
  { href: "/compare", label: { en: "Compare", bn: "তুলনা" } },
];

const MOBILE_SERVICE_LINKS = [
  { href: "/services", label: { en: "All Services", bn: "সব সেবা" } },
  { href: "/services/printing", label: { en: "Printing", bn: "প্রিন্টিং" } },
  { href: "/services/legal", label: { en: "Legal", bn: "আইনি" } },
  { href: "/services/software", label: { en: "Software", bn: "সফটওয়্যার" } },
  { href: "/book", label: { en: "Book a Service", bn: "সেবা বুক করুন" } },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMega, setMobileMega] = useState<"products" | "services" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT();

  const { itemCount } = useCartStore();
  const { lang, toggle } = useLanguageStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const count = itemCount();

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
      setMobileOpen(false);
    }
  };

  return (
    <header
      className={cn(
        "fixed top-[var(--announcement-height)] left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "glass border-b border-white/40 shadow-glass py-0"
          : "bg-transparent py-0"
      )}
    >
      <nav
        className={cn(
          "container mx-auto px-4 h-16 flex items-center justify-between gap-3 transition-all duration-300",
          !isScrolled && "rounded-2xl mt-1 mx-2 max-w-[calc(100%-1rem)] glass border border-white/30"
        )}
        aria-label={lang === "bn" ? "প্রধান নেভিগেশন" : "Main navigation"}
      >
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
          <BrandLogo size="sm" href={false} priority />
          <span className="hidden sm:block min-w-0">
            <span className="font-bold text-lg tracking-tight block text-brand-800 dark:text-white truncate">
              {getBrandName(lang)}
            </span>
            <p className="text-[10px] font-medium text-brand-600/90 dark:text-brand-200/80 truncate max-w-[11rem] md:max-w-[15rem] leading-snug">
              : {getBrandTagline(lang)}
            </p>
          </span>
        </Link>

        <MegaMenu onNavigate={() => setMobileOpen(false)} />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center relative">
              <div className="relative">
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("nav_search") + "..."}
                  className="w-36 xs:w-44 sm:w-56 px-3 py-1.5 pr-8 rounded-xl text-sm input max-w-[calc(100vw-8rem)]"
                />
                <button type="submit" aria-label="Submit search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600">
                  <Search className="w-4 h-4" />
                </button>
                <SearchSuggestions query={searchQuery} onSelect={() => { setSearchOpen(false); setSearchQuery(""); }} />
              </div>
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}
                className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setSearchOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-white/10 transition-colors"
              aria-label={t("nav_search")}>
              <Search className="w-[18px] h-[18px]" />
            </button>
          )}

          <button type="button" onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-brand-50 dark:text-gray-300 dark:hover:bg-white/10"
            aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <button type="button" onClick={toggle}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors dark:border-brand-700 dark:text-brand-300"
            aria-label="Toggle language">
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "বাং" : "EN"}
          </button>

          <Link href="/cart" className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20" aria-label={`${t("nav_cart")} (${count})`}>
            <ShoppingCart className="w-[18px] h-[18px]" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          <Link href="/projects" className="hidden md:inline-flex btn btn-primary btn-sm btn-ripple">
            <Briefcase className="w-4 h-4" />
            {t("nav_get_quote")}
          </Link>

          <button type="button" onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden glass border-t border-white/40 dark:border-white/10 mx-2 mb-2 rounded-2xl shadow-glass animate-slide-up max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2.5 sm:hidden">
            <BrandLogo size="xs" href={false} />
            <p className="text-[10px] font-medium text-brand-700 dark:text-brand-200 min-w-0 leading-snug">
              {getBrandFullTitle(lang)}
            </p>
          </div>
          <div className="px-4 pt-2">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("nav_search") + "..."}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-400 input"
              />
            </form>
          </div>
          <ul className="px-4 py-3 space-y-1">
            {(["products", "services"] as const).map((section) => {
              const isOpen = mobileMega === section;
              const title = section === "products" ? t("nav_products") : t("nav_services");
              const links = section === "products" ? MOBILE_PRODUCT_LINKS : MOBILE_SERVICE_LINKS;
              return (
                <li key={section}>
                  <button
                    type="button"
                    onClick={() => setMobileMega(isOpen ? null : section)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-gray-800 dark:text-gray-100 font-medium hover:bg-brand-50 dark:hover:bg-white/10 text-sm"
                    aria-expanded={isOpen}
                  >
                    {title}
                    <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <ul className="ml-3 mt-1 space-y-0.5 border-l border-brand-100 dark:border-white/10 pl-3">
                      {links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className="block px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-white/10"
                          >
                            {lang === "bn" ? link.label.bn : link.label.en}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {MOBILE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-gray-800 dark:text-gray-100 font-medium hover:bg-brand-50 dark:hover:bg-white/10 text-sm">
                  {t(link.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/track" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-white/10 text-sm">
                {t("nav_track")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-white/10 text-sm">
                {lang === "bn" ? "ড্যাশবোর্ড" : "Dashboard"}
              </Link>
            </li>
          </ul>
          <div className="px-4 pb-4">
            <Link href="/projects" onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-medium">
              <Briefcase className="w-4 h-4" />
              {t("nav_get_quote")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
