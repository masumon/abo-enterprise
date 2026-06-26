"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Menu, X, Globe, ChevronDown,
  Search, ShoppingBag, Calendar, Briefcase,
  Cpu, Printer, Scale, Globe2, Bot, Zap, Building2,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: { en: "Home", bn: "হোম" } },
  { href: "/products", label: { en: "Products", bn: "পণ্য" } },
  {
    label: { en: "Services", bn: "সেবা" },
    href: "/services",
    children: [
      { href: "/services/printing", label: { en: "Printing", bn: "প্রিন্টিং" }, icon: Printer },
      { href: "/services/legal", label: { en: "Case Writing", bn: "কেস রাইটিং" }, icon: Scale },
      { href: "/services/software", label: { en: "Website Design", bn: "ওয়েবসাইট ডিজাইন" }, icon: Globe2 },
      { href: "/services", label: { en: "All Services", bn: "সব সেবা" }, icon: Calendar },
    ],
  },
  {
    label: { en: "Solutions", bn: "সমাধান" },
    href: "/projects",
    children: [
      { href: "/services/software", label: { en: "POS System", bn: "POS সিস্টেম" }, icon: Building2 },
      { href: "/services/software", label: { en: "ERP / CRM", bn: "ERP / CRM" }, icon: Cpu },
      { href: "/services/software", label: { en: "AI Automation", bn: "AI অটোমেশন" }, icon: Bot },
      { href: "/projects", label: { en: "Custom Projects", bn: "কাস্টম প্রজেক্ট" }, icon: Zap },
    ],
  },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
  { href: "/track", label: { en: "Track Order", bn: "অর্ডার ট্র্যাক" } },
];

const QUICK_SEARCHES = [
  { label: { en: "USB Cable", bn: "USB ক্যাবল" }, href: "/products?q=usb" },
  { label: { en: "Passport Service", bn: "পাসপোর্ট সেবা" }, href: "/services" },
  { label: { en: "Website Design", bn: "ওয়েবসাইট" }, href: "/services/software" },
  { label: { en: "POS System", bn: "POS সিস্টেম" }, href: "/services/software" },
  { label: { en: "AI Chatbot", bn: "AI চ্যাটবট" }, href: "/projects" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { itemCount, openCart } = useCartStore();
  const { lang, toggle } = useLanguageStore();
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
    }
  };

  const textCls = isScrolled
    ? "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
    : "text-white/90 hover:text-white hover:bg-white/10";

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100" : "gradient-brand"
    )}>
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-full border-2 border-white/80 bg-white flex items-center justify-center overflow-hidden">
            <Image src="https://i.ibb.co.com/pjY3wvG9/1769284089412.png" alt="ABO" width={36} height={36} className="object-cover" />
          </div>
          <span className={cn("font-bold text-lg tracking-tight hidden sm:block", isScrolled ? "text-brand-700" : "text-white")}>
            ABO Enterprise
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <li key={link.href} className="relative"
              onMouseEnter={() => link.children && setActiveDropdown(link.href!)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              {link.children ? (
                <>
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === link.href ? "true" : "false"}
                    aria-label={lang === "bn" ? link.label.bn : link.label.en}
                    className={cn("flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors", textCls)}
                  >
                    {lang === "bn" ? link.label.bn : link.label.en}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <div className={cn(
                    "absolute top-full left-0 mt-2 w-60 rounded-2xl py-2 transition-all duration-200",
                    "bg-white/95 backdrop-blur-xl border border-gray-100/80",
                    "shadow-[0_8px_32px_rgba(30,91,168,0.12),0_2px_8px_rgba(0,0,0,0.06)]",
                    activeDropdown === link.href ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
                  )}>
                    {link.children.map((child) => {
                      const Icon = child.icon;
                      return (
                        <Link key={child.href + child.label.en} href={child.href}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                        >
                          {Icon && <Icon className="w-4 h-4 text-brand-500" />}
                          {lang === "bn" ? child.label.bn : child.label.en}
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : (
                <Link href={link.href!} className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-colors", textCls)}>
                  {lang === "bn" ? link.label.bn : link.label.en}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative">
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === "bn" ? "খুঁজুন..." : "Search..."}
                  className="w-44 sm:w-64 px-3 py-1.5 pr-8 rounded-lg text-sm bg-white text-gray-900 border border-gray-200 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button type="submit" aria-label="Submit search" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-600">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)}
                className={cn("ml-1 w-8 h-8 flex items-center justify-center rounded-lg", isScrolled ? "text-gray-600 hover:bg-gray-100" : "text-white hover:bg-white/10")}>
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setSearchOpen(true)}
              className={cn("w-9 h-9 flex items-center justify-center rounded-lg transition-colors", isScrolled ? "text-gray-600 hover:bg-gray-100" : "text-white hover:bg-white/10")}
              aria-label="Open search">
              <Search className="w-[18px] h-[18px]" />
            </button>
          )}

          {/* Language */}
          <button type="button" onClick={toggle}
            className={cn("hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
              isScrolled ? "border-brand-200 text-brand-700 hover:bg-brand-50" : "border-white/40 text-white hover:bg-white/10")}
            aria-label="Toggle language">
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "বাং" : "EN"}
          </button>

          {/* Cart */}
          <button type="button" onClick={openCart}
            className={cn("relative w-10 h-10 flex items-center justify-center rounded-xl transition-all",
              isScrolled ? "bg-accent-500 text-white hover:bg-accent-600" : "bg-white/15 text-white hover:bg-white/25")}
            aria-label={`Cart (${count} items)`}>
            <ShoppingCart className="w-[18px] h-[18px]" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          {/* Mobile toggle */}
          <button type="button" onClick={() => setMobileOpen((v) => !v)}
            className={cn("lg:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
              isScrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10")}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl">
          {/* Mobile Search */}
          <div className="px-4 pt-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "bn" ? "কিছু খুঁজুন..." : "Search anything..."}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-brand-400"
              />
            </form>
          </div>

          {/* Quick Entry Points */}
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            {[
              { href: "/products", icon: ShoppingBag, label: { en: "Shop", bn: "শপ" }, color: "bg-blue-50 text-blue-700" },
              { href: "/services", icon: Calendar, label: { en: "Book", bn: "বুক" }, color: "bg-green-50 text-green-700" },
              { href: "/projects", icon: Briefcase, label: { en: "Solutions", bn: "সমাধান" }, color: "bg-purple-50 text-purple-700" },
            ].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl font-medium text-xs", item.color)}>
                <item.icon className="w-5 h-5" />
                {lang === "bn" ? item.label.bn : item.label.en}
              </Link>
            ))}
          </div>

          <ul className="px-4 pb-2 space-y-0.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href!} onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-gray-800 font-medium hover:bg-brand-50 hover:text-brand-700 transition-colors text-sm">
                  {lang === "bn" ? link.label.bn : link.label.en}
                </Link>
                {link.children && (
                  <ul className="ml-4 mb-1 space-y-0.5">
                    {link.children.map((child) => (
                      <li key={child.href + child.label.en}>
                        <Link href={child.href} onClick={() => setMobileOpen(false)}
                          className="block px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-brand-700 hover:bg-brand-50 transition-colors">
                          {lang === "bn" ? child.label.bn : child.label.en}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4 flex gap-2">
            <button type="button" onClick={() => { toggle(); setMobileOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-brand-200 text-brand-700 text-sm font-medium hover:bg-brand-50">
              <Globe className="w-4 h-4" />
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <button type="button" onClick={() => { openCart(); setMobileOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-accent-500 text-white text-sm font-medium hover:bg-accent-600">
              <ShoppingCart className="w-4 h-4" />
              {lang === "bn" ? `কার্ট (${count})` : `Cart (${count})`}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
