"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ShoppingBag, Printer, Scale, Code2, Building2, Heart, GitCompare } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils";

interface MegaMenuProps {
  onNavigate?: () => void;
}

export default function MegaMenu({ onNavigate }: MegaMenuProps) {
  const { lang } = useLanguageStore();
  const t = useT();
  const [openMenu, setOpenMenu] = useState<"products" | "services" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const close = () => {
    setOpenMenu(null);
    onNavigate?.();
  };

  const productCategories = [
    { href: "/products", label: lang === "bn" ? "সব পণ্য" : "All Products" },
    { href: "/products?category=accessories", label: lang === "bn" ? "এক্সেসরিজ" : "Accessories" },
    { href: "/products?category=gadgets", label: lang === "bn" ? "গ্যাজেট" : "Gadgets" },
    { href: "/products?category=electronics", label: lang === "bn" ? "ইলেকট্রনিক্স" : "Electronics" },
    { href: "/products?category=computer", label: lang === "bn" ? "কম্পিউটার" : "Computer" },
  ];

  const serviceLinks = [
    { href: "/services", label: lang === "bn" ? "সব সেবা" : "All Services", icon: Building2 },
    { href: "/services/printing", label: lang === "bn" ? "প্রিন্টিং" : "Printing", icon: Printer },
    { href: "/services/legal", label: lang === "bn" ? "আইনি" : "Legal", icon: Scale },
    { href: "/services/software", label: lang === "bn" ? "সফটওয়্যার" : "Software", icon: Code2 },
    { href: "/book", label: lang === "bn" ? "সেবা বুক করুন" : "Book a Service", icon: Building2 },
  ];

  const menus = [
    {
      id: "products" as const,
      label: t("nav_products"),
      href: "/products",
      icon: ShoppingBag,
      columns: [
        {
          title: lang === "bn" ? "কেনাকাটা" : "Shop",
          links: productCategories,
        },
        {
          title: lang === "bn" ? "আরও" : "More",
          links: [
            { href: "/profile/wishlist", label: lang === "bn" ? "উইশলিস্ট" : "Wishlist", icon: Heart },
            { href: "/compare", label: lang === "bn" ? "তুলনা" : "Compare", icon: GitCompare },
          ],
        },
      ],
    },
    {
      id: "services" as const,
      label: t("nav_services"),
      href: "/services",
      icon: Building2,
      columns: [
        {
          title: lang === "bn" ? "সেবাসমূহ" : "Services",
          links: serviceLinks,
        },
      ],
    },
  ];

  const simpleLinks = [
    { href: "/blog", label: t("nav_blog") },
    { href: "/projects", label: t("nav_solutions") },
    { href: "/about", label: t("nav_about") },
    { href: "/contact", label: t("nav_contact") },
  ];

  return (
    <div ref={ref} className="hidden lg:flex items-center gap-1">
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => setOpenMenu(menu.id)}
            className={cn(
              "flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
              openMenu === menu.id
                ? "text-brand-700 dark:text-brand-300 bg-brand-50/80 dark:bg-white/10"
                : "text-gray-700 dark:text-gray-200 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50/80 dark:hover:bg-white/10"
            )}
            aria-expanded={openMenu === menu.id}
            aria-haspopup="true"
          >
            {menu.label}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", openMenu === menu.id && "rotate-180")} />
          </button>

          {openMenu === menu.id && (
            <div
              className="absolute top-full left-0 mt-2 w-[min(100vw-2rem,28rem)] enterprise-card p-4 shadow-glass-strong animate-fade-in z-50"
              onMouseLeave={() => setOpenMenu(null)}
            >
              <div className={cn("grid gap-4", menu.columns.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {menu.columns.map((col) => (
                  <div key={col.title}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2 px-2">{col.title}</p>
                    <ul className="space-y-0.5">
                      {col.links.map((link) => {
                        const Icon = "icon" in link ? link.icon : menu.icon;
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={close}
                              className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm text-heading hover:bg-brand-50 dark:hover:bg-white/10 transition-colors"
                            >
                              <Icon className="w-4 h-4 text-brand-600 dark:text-brand-300 flex-shrink-0" />
                              {link.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
                <Link href={menu.href} onClick={close} className="text-xs font-semibold text-brand-600 hover:underline px-2">
                  {lang === "bn" ? "সব দেখুন →" : "View all →"}
                </Link>
              </div>
            </div>
          )}
        </div>
      ))}

      {simpleLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50/80 dark:hover:bg-white/10 transition-all"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
