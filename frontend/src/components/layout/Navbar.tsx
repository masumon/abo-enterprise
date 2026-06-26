"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Menu, X, Globe, Moon, Sun, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: { en: "Home", bn: "হোম" } },
  {
    label: { en: "Products", bn: "পণ্য" },
    href: "/products",
  },
  {
    label: { en: "Services", bn: "সেবা" },
    href: "/services",
    children: [
      { href: "/services/printing", label: { en: "Printing", bn: "প্রিন্টিং" } },
      { href: "/services/legal", label: { en: "Legal Services", bn: "আইনি সেবা" } },
      { href: "/services/software", label: { en: "Software & AI", bn: "সফটওয়্যার ও AI" } },
    ],
  },
  { href: "/about", label: { en: "About", bn: "আমাদের সম্পর্কে" } },
  { href: "/contact", label: { en: "Contact", bn: "যোগাযোগ" } },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const { itemCount, openCart } = useCartStore();
  const { lang, toggle } = useLanguageStore();
  const count = itemCount();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark((v) => !v);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100"
          : "gradient-brand"
      )}
    >
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-full border-2 border-white/80 bg-white flex items-center justify-center overflow-hidden">
            <Image
              src="https://i.ibb.co.com/pjY3wvG9/1769284089412.png"
              alt="ABO Enterprise"
              width={36}
              height={36}
              className="object-cover"
            />
          </div>
          <span
            className={cn(
              "font-bold text-lg tracking-tight",
              isScrolled ? "text-brand-700" : "text-white"
            )}
          >
            ABO Enterprise
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href} className="relative group">
              {link.children ? (
                <>
                  <button
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isScrolled
                        ? "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                    )}
                    onMouseEnter={() => setActiveDropdown(link.href)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    {lang === "bn" ? link.label.bn : link.label.en}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <ul
                    className={cn(
                      "absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 transition-all duration-150",
                      activeDropdown === link.href
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-2 pointer-events-none"
                    )}
                    onMouseEnter={() => setActiveDropdown(link.href)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    {link.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                        >
                          {lang === "bn" ? child.label.bn : child.label.en}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Link
                  href={link.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isScrolled
                      ? "text-gray-700 hover:text-brand-600 hover:bg-brand-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  {lang === "bn" ? link.label.bn : link.label.en}
                </Link>
              )}
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
              isScrolled
                ? "border-brand-200 text-brand-700 hover:bg-brand-50"
                : "border-white/40 text-white hover:bg-white/10"
            )}
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === "en" ? "বাং" : "EN"}
          </button>

          <button
            onClick={toggleDark}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
              isScrolled ? "text-gray-600 hover:bg-gray-100" : "text-white hover:bg-white/10"
            )}
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={openCart}
            className={cn(
              "relative w-10 h-10 flex items-center justify-center rounded-xl transition-all",
              isScrolled
                ? "bg-accent-500 text-white hover:bg-accent-600"
                : "bg-white/15 text-white hover:bg-white/25"
            )}
            aria-label={`Cart (${count} items)`}
          >
            <ShoppingCart className="w-4.5 h-4.5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className={cn(
              "lg:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors",
              isScrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"
            )}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-xl animate-slide-up">
          <ul className="container mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-gray-800 font-medium hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {lang === "bn" ? link.label.bn : link.label.en}
                </Link>
                {link.children && (
                  <ul className="ml-4 mt-1 space-y-1">
                    {link.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className="block px-4 py-2 rounded-lg text-sm text-gray-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                        >
                          {lang === "bn" ? child.label.bn : child.label.en}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4 flex gap-3">
            <button
              onClick={() => { toggle(); setMobileOpen(false); }}
              className="flex-1 btn btn-outline btn-sm"
            >
              <Globe className="w-4 h-4" />
              {lang === "en" ? "বাংলা" : "English"}
            </button>
            <button
              onClick={() => { openCart(); setMobileOpen(false); }}
              className="flex-1 btn btn-primary btn-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              {lang === "bn" ? `কার্ট (${count})` : `Cart (${count})`}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
