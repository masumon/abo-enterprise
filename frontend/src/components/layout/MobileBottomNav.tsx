"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, Calendar, User } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         icon: Home,        label: { en: "Home",   bn: "হোম" } },
  { href: "/search",   icon: Search,      label: { en: "Search", bn: "খুঁজুন" } },
  { href: "/products", icon: ShoppingBag, label: { en: "Shop",   bn: "শপ" } },
  { href: "/services", icon: Calendar,    label: { en: "Book",   bn: "বুক" } },
  { href: "/profile",  icon: User,        label: { en: "Profile",bn: "প্রোফাইল" } },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguageStore();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        className="border-t border-gray-100/80"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 -4px 24px rgba(30,91,168,0.08), 0 -1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <div className="grid grid-cols-5 h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all duration-200",
                  isActive ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
                )}
                aria-label={lang === "bn" ? item.label.bn : item.label.en}
              >
                <span className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200",
                  isActive ? "bg-brand-50 shadow-sm shadow-brand-100" : ""
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive ? "text-brand-600 scale-110" : "text-gray-400"
                  )} />
                </span>
                <span className={cn("transition-colors duration-200", isActive ? "text-brand-600 font-semibold" : "")}>
                  {lang === "bn" ? item.label.bn : item.label.en}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="h-safe-bottom" />
      </div>
    </nav>
  );
}
