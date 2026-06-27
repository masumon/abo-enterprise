"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Menu, X, Globe, Search, Briefcase, Moon, Sun,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { useThemeStore } from "@/store/theme";
import { useT } from "@/lib/i18n/useT";
import SearchSuggestions from "@/components/search/SearchSuggestions";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/products", key: "nav_products" as const },
  { href: "/services", key: "nav_services" as const },
  { href: "/blog", key: "nav_blog" as const },
  { href: "/projects", key: "nav_solutions" as const },
  { href: "/about", key: "nav_about" as const },
  { href: "/contact", key: "nav_contact" as const },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useT();

  const { itemCount, openCart } = useCartStore();
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
      >
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-full border-2 border-brand-200 bg-white flex items-center justify-center overflow-hidden shadow-sm">
            <Image src="/logo.jpg" alt="ABO Enterprise" width={36} height={36} className="object-cover" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block text-brand-800">
            ABO Enterprise
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 hover:text-brand-700 hover:bg-brand-50/80 transition-all"
              >
                {t(link.key)}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center relative">
              <div className="relative">
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("nav_search") + "..."}
                  className="w-44 sm:w-56 px-3 py-1.5 pr-8 rounded-xl text-sm input"
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
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-brand-50 transition-colors"
              aria-label={t("nav_search")}>
              <Search className="w-[18px] h-[18px]" />
            </button>
          )}

          <button type="button" onClick={toggleTheme}
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-gray-600 hover:bg-brand-50 dark:text-gray-300 dark:hover:bg-white/10"
            aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <button type="button" onClick={toggle}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors"
            aria-label="Toggle language">
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "বাং" : "EN"}
          </button>

          <button type="button" onClick={openCart}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20"
            aria-label={`${t("nav_cart")} (${count})`}>
            <ShoppingCart className="w-[18px] h-[18px]" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          <Link href="/projects" className="hidden md:inline-flex btn btn-primary btn-sm btn-ripple">
            <Briefcase className="w-4 h-4" />
            {t("nav_get_quote")}
          </Link>

          <button type="button" onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden glass border-t border-white/40 mx-2 mb-2 rounded-2xl shadow-glass animate-slide-up">
          <div className="px-4 pt-4">
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
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-gray-800 font-medium hover:bg-brand-50 text-sm">
                  {t(link.key)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/track" onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-gray-600 hover:bg-brand-50 text-sm">
                {t("nav_track")}
              </Link>
            </li>
          </ul>
          <div className="px-4 pb-4 flex gap-2">
            <button type="button" onClick={() => { toggle(); setMobileOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-200 text-brand-700 text-sm font-medium">
              <Globe className="w-4 h-4" />
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <Link href="/projects" onClick={() => setMobileOpen(false)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-medium">
              <Briefcase className="w-4 h-4" />
              {t("nav_get_quote")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
