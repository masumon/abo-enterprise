"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Menu, Bell, RotateCw, Languages, Moon, Sun, X, ShoppingCart, Briefcase, Users } from "lucide-react";
import { getAdminPageTitle } from "@/lib/adminNav";
import { useAlertStore } from "@/store/alerts";
import { useLanguageStore } from "@/store/language";
import { useState } from "react";

interface Props {
  adminName: string;
  adminRole?: string;
  onMenuClick: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
}

export default function AdminTopBar({ adminName, adminRole, onMenuClick, dark, onToggleTheme }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, toggle: toggleLang } = useLanguageStore();
  const pageTitle = getAdminPageTitle(pathname, lang);
  const { pendingOrders, pendingBookings, newLeads } = useAlertStore();
  const alertTotal = pendingOrders + pendingBookings + newLeads;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const notifItems = [
    { key: "orders", icon: ShoppingCart, label: lang === "bn" ? "অপেক্ষমান অর্ডার" : "Pending orders", count: pendingOrders, href: "/admin/orders" },
    { key: "bookings", icon: Briefcase, label: lang === "bn" ? "অপেক্ষমান বুকিং" : "Pending bookings", count: pendingBookings, href: "/admin/bookings" },
    { key: "leads", icon: Users, label: lang === "bn" ? "নতুন লিড" : "New leads", count: newLeads, href: "/admin/leads" },
  ].filter((i) => i.count > 0 && !dismissed.has(i.key));
  const visibleTotal = notifItems.reduce((s, i) => s + i.count, 0);
  const dismiss = (key: string) => setDismissed((prev) => new Set(prev).add(key));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 admin-topbar">
      <div className="flex items-center gap-3 px-4 md:px-6 lg:px-8 h-14">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-brand-900/20"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1" aria-label="Breadcrumb">
          <Link href="/admin" className="text-gray-400 hover:text-brand-600 transition-colors shrink-0">
            {lang === "bn" ? "অ্যাডমিন" : "Admin"}
          </Link>
          {pathname !== "/admin" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Light mode" : "Dark mode"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={toggleLang}
            className="w-9 h-9 flex items-center justify-center gap-1 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-[10px] font-bold"
            aria-label="Toggle language"
            title={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Refresh admin panel"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              aria-label={lang === "bn" ? "নোটিফিকেশন" : "Notifications"}
              aria-expanded={notifOpen}
            >
              <Bell className="w-4 h-4" />
              {visibleTotal > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {visibleTotal > 99 ? "99+" : visibleTotal}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} aria-hidden />
                <div className="absolute right-0 mt-2 w-72 z-40 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-white/10">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {lang === "bn" ? "নোটিফিকেশন" : "Notifications"}
                    </span>
                    {notifItems.length > 0 && (
                      <button type="button" onClick={() => setDismissed(new Set(["orders", "bookings", "leads"]))} className="text-xs text-brand-600 hover:underline">
                        {lang === "bn" ? "সব ক্লিয়ার" : "Clear all"}
                      </button>
                    )}
                  </div>
                  {notifItems.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      {lang === "bn" ? "নতুন কিছু নেই ✅" : "You're all caught up ✅"}
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                      {notifItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li key={item.key} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50/60 dark:hover:bg-white/[0.03]">
                            <Link href={item.href} onClick={() => setNotifOpen(false)} className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm text-gray-800 dark:text-gray-100 truncate">{item.label}</span>
                                <span className="block text-xs text-gray-400">{item.count}</span>
                              </span>
                            </Link>
                            <button type="button" onClick={() => dismiss(item.key)} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 flex-shrink-0" aria-label={lang === "bn" ? "ক্লিয়ার" : "Clear"}>
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold">
              {adminName[0]?.toUpperCase()}
            </div>
            <div className="text-right leading-tight">
              <p className="text-xs font-semibold text-gray-900 max-w-[120px] truncate">{adminName}</p>
              <p className="text-[10px] text-gray-400 capitalize">{adminRole ?? "admin"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
