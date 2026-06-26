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

  // Hide on admin pages
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-100 shadow-2xl">
      <div className="grid grid-cols-5 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                isActive ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
              )}
              aria-label={lang === "bn" ? item.label.bn : item.label.en}
            >
              <span className={cn(
                "w-8 h-8 flex items-center justify-center rounded-xl transition-all",
                isActive ? "bg-brand-50" : ""
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "text-brand-600" : "text-gray-400")} />
              </span>
              <span className={isActive ? "text-brand-600" : ""}>
                {lang === "bn" ? item.label.bn : item.label.en}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-bottom bg-white" />
    </nav>
  );
}
