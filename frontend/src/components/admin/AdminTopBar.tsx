"use client";

import { useProfileStore } from "@/store/adminProfile";
import AdminAvatar from "@/components/admin/AdminAvatar";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Sparkles, ChevronRight, Menu, Bell, RotateCw, Languages, Moon, Sun, X, ShoppingCart, Briefcase, Users, AlertTriangle, MoreVertical, ExternalLink, HelpCircle } from "lucide-react";
import { getAdminPageInfo, getAdminPageTitle } from "@/lib/adminNav";
import AdminInstallButton from "@/components/admin/AdminInstallButton";
import { useAlertStore } from "@/store/alerts";
import { useLanguageStore } from "@/store/language";
import { useEffect, useState } from "react";
import { notificationsApi, type NotificationRecord } from "@/lib/api";

const MENU_ITEM = "w-full min-h-[48px] flex items-center gap-3 px-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50";
/** Round coloured icon chip used in the phone "more" menu. */
const chip = (tone: string) => `w-9 h-9 rounded-xl flex items-center justify-center flex-none ${tone}`;
const TONE = {
  ai: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  help: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
  site: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  theme: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
  lang: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
  refresh: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
};

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
  const pageInfo = getAdminPageInfo(pathname);
  const [helpOpen, setHelpOpen] = useState(false);
  const { pendingOrders, pendingBookings, newLeads } = useAlertStore();
  const alertTotal = pendingOrders + pendingBookings + newLeads;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // Phones (< 640px): install/theme/language/refresh move into a compact "more" menu.
  const [moreOpen, setMoreOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [persistentNotifs, setPersistentNotifs] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = () => {
    notificationsApi.unreadCount().then((r) => { const n = r.data.data?.count ?? 0; setUnreadCount(n); useAlertStore.getState().setUnread(n); }).catch(() => {});
    notificationsApi.list({ unread_only: true, per_page: 5 }).then((r) => setPersistentNotifs(r.data.data ?? [])).catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      loadNotifications();
    }, 30_000);
    return () => clearInterval(timer);
     
  }, []);

  const markNotificationRead = (id: string) => {
    notificationsApi.markRead(id).catch(() => {});
    setPersistentNotifs((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => { const n = Math.max(0, c - 1); useAlertStore.getState().setUnread(n); return n; });
  };

  const markAllNotificationsRead = () => {
    notificationsApi.markAllRead().catch(() => {});
    setPersistentNotifs([]);
    setUnreadCount(0);
    useAlertStore.getState().setUnread(0);
  };

  const notifItems = [
    { key: "orders", icon: ShoppingCart, label: lang === "bn" ? "অপেক্ষমান অর্ডার" : "Pending orders", count: pendingOrders, href: "/sumon/orders" },
    { key: "bookings", icon: Briefcase, label: lang === "bn" ? "অপেক্ষমান বুকিং" : "Pending bookings", count: pendingBookings, href: "/sumon/bookings" },
    { key: "leads", icon: Users, label: lang === "bn" ? "নতুন লিড" : "New leads", count: newLeads, href: "/sumon/leads" },
  ].filter((i) => i.count > 0 && !dismissed.has(i.key));
  const visibleTotal = notifItems.reduce((s, i) => s + i.count, 0) + unreadCount;
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
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 lg:px-8 h-14">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-brand-900/20"
          aria-label={lang === "bn" ? "মেনু খুলুন" : "Open menu"}
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1" aria-label="Breadcrumb">
          <Link href="/sumon" className={`text-gray-400 hover:text-brand-600 transition-colors shrink-0 ${pathname !== "/sumon" ? "hidden sm:inline" : ""}`}>
            {lang === "bn" ? "অ্যাডমিন" : "Admin"}
          </Link>
          {pathname !== "/sumon" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0 hidden sm:block" />
              <span className="font-semibold text-gray-900 truncate inline-flex items-center gap-2">{pageInfo?.icon && <pageInfo.icon className="w-4 h-4 text-brand-600 flex-none" aria-hidden />}{pageTitle}</span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="hidden sm:flex items-center">
            <AdminInstallButton />
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("abo-admin-search"))}
            className="h-10 min-w-[40px] sm:h-9 sm:min-w-0 px-2.5 flex items-center justify-center gap-1.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-xs font-semibold"
            aria-label={lang === "bn" ? "পেজ খুঁজুন" : "Search pages"}
            title={lang === "bn" ? "পেজ খুঁজুন (Ctrl+K)" : "Search pages (Ctrl+K)"}
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">{lang === "bn" ? "খুঁজুন" : "Search"}</span>
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex h-9 px-2.5 items-center justify-center gap-1.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-xs font-semibold"
            aria-label={lang === "bn" ? "ওয়েবসাইট দেখুন (নতুন ট্যাবে)" : "View website (new tab)"} title={lang === "bn" ? "ওয়েবসাইট দেখুন" : "View website"}>
            <ExternalLink className="w-4 h-4" aria-hidden />
            <span className="hidden xl:inline">{lang === "bn" ? "সাইট দেখুন" : "View site"}</span>
          </a>
          {/* "What is this page?" — the page's own description from the menu. */}
          <div className="relative hidden sm:block">
            <button type="button" onClick={() => { setHelpOpen((v) => !v); setNotifOpen(false); setMoreOpen(false); }}
              className="h-10 min-w-[40px] sm:h-9 sm:min-w-0 px-2.5 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              aria-label={lang === "bn" ? "এই পাতার সাহায্য" : "Help for this page"} aria-expanded={helpOpen} title={lang === "bn" ? "এই পাতা কী করে?" : "What is this page?"}>
              <HelpCircle className="w-4 h-4" aria-hidden />
            </button>
            {helpOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setHelpOpen(false)} aria-hidden />
                <div role="dialog" aria-label={lang === "bn" ? "এই পাতার সাহায্য" : "Page help"} className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] z-40 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl p-4 space-y-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{pageTitle}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{pageInfo?.descBn ?? (lang === "bn" ? "অ্যাডমিনের মূল পাতা — আজকের অর্ডার, বুকিং ও জরুরি কাজ এক নজরে।" : "Admin home — today's orders, bookings and urgent work at a glance.")}</p>
                  <Link href="/sumon/help" onClick={() => setHelpOpen(false)} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 hover:underline">
                    {lang === "bn" ? "পুরো সাহায্য গাইড →" : "Full help guide →"}
                  </Link>
                </div>
              </>
            )}
          </div>
          {/* Phones/tablets: AI assistant lives here instead of a floating button. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("abo:open-ai"))}
            className="hidden sm:flex lg:hidden h-10 min-w-[40px] px-2.5 items-center justify-center rounded-xl text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label={lang === "bn" ? "AI সহকারী" : "AI assistant"}
            title={lang === "bn" ? "AI সহকারী" : "AI assistant"}
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex items-center gap-2">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              aria-label={dark ? (lang === "bn" ? "লাইট মোড" : "Switch to light mode") : (lang === "bn" ? "ডার্ক মোড" : "Switch to dark mode")}
              title={dark ? (lang === "bn" ? "লাইট মোড" : "Light mode") : (lang === "bn" ? "ডার্ক মোড" : "Dark mode")}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={toggleLang}
            className="w-9 h-9 flex items-center justify-center gap-1 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 text-[10px] font-bold"
            aria-label={lang === "bn" ? "ভাষা বদলান" : "Toggle language"}
            title={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label={lang === "bn" ? "অ্যাডমিন রিফ্রেশ করুন" : "Refresh admin panel"}
            title={lang === "bn" ? "রিফ্রেশ" : "Refresh"}
          >
            <RotateCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => { setNotifOpen((v) => !v); setMoreOpen(false); setHelpOpen(false); }}
              className="relative w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
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
                    {(notifItems.length > 0 || persistentNotifs.length > 0) && (
                      <button
                        type="button"
                        onClick={() => { setDismissed(new Set(["orders", "bookings", "leads"])); markAllNotificationsRead(); }}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        {lang === "bn" ? "সব ক্লিয়ার" : "Clear all"}
                      </button>
                    )}
                  </div>
                  {notifItems.length === 0 && persistentNotifs.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      {lang === "bn" ? "নতুন কিছু নেই ✅" : "You're all caught up ✅"}
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                      {persistentNotifs.map((n) => (
                        <li key={n.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50/60 dark:hover:bg-white/[0.03]">
                          <Link
                            href={n.link || "/sumon/notifications"}
                            onClick={() => { setNotifOpen(false); markNotificationRead(n.id); }}
                            className="flex items-center gap-2.5 flex-1 min-w-0"
                          >
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.severity === "error" ? "bg-red-50 text-red-600" : n.severity === "warning" ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-600"}`}>
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm text-gray-800 dark:text-gray-100 truncate">{n.title}</span>
                              {n.body && <span className="block text-xs text-gray-400 truncate">{n.body}</span>}
                            </span>
                          </Link>
                          <button type="button" onClick={() => markNotificationRead(n.id)} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 flex-shrink-0" aria-label={lang === "bn" ? "পড়া হয়েছে চিহ্নিত করুন" : "Mark as read"}>
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
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
                  {persistentNotifs.length > 0 && (
                    <Link
                      href="/sumon/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="block px-4 py-2.5 text-center text-xs font-semibold text-brand-600 hover:bg-gray-50/60 dark:hover:bg-white/[0.03] border-t border-gray-100 dark:border-white/10"
                    >
                      {lang === "bn" ? "সব দেখুন →" : "View all →"}
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
          {/* "More" menu — phones only; keeps every top-bar function reachable. */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => { setMoreOpen((v) => !v); setNotifOpen(false); setHelpOpen(false); }}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
              aria-label={lang === "bn" ? "আরও অপশন" : "More options"}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} aria-hidden />
                <div role="menu" className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] z-40 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl p-1.5 space-y-0.5">
                  <button type="button" role="menuitem" onClick={() => { window.dispatchEvent(new Event("abo:open-ai")); setMoreOpen(false); }} className={MENU_ITEM}>
                    <span className={chip(TONE.ai)}><Sparkles className="w-4 h-4" /></span>
                    {lang === "bn" ? "AI সহকারী" : "AI assistant"}
                  </button>
                  <Link role="menuitem" href="/sumon/help" onClick={() => setMoreOpen(false)} className={MENU_ITEM}>
                    <span className={chip(TONE.help)}><HelpCircle className="w-4 h-4" aria-hidden /></span>
                    {lang === "bn" ? "এই পাতার সাহায্য" : "Help"}
                  </Link>
                  {onToggleTheme && (
                    <button type="button" role="menuitem" onClick={() => { onToggleTheme(); setMoreOpen(false); }} className={MENU_ITEM}>
                      <span className={chip(TONE.theme)}>{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</span>
                      {dark ? (lang === "bn" ? "লাইট মোড" : "Light mode") : (lang === "bn" ? "ডার্ক মোড" : "Dark mode")}
                    </button>
                  )}
                  <a role="menuitem" href="/" target="_blank" rel="noopener noreferrer" onClick={() => setMoreOpen(false)} className={MENU_ITEM}>
                    <span className={chip(TONE.site)}><ExternalLink className="w-4 h-4" aria-hidden /></span>
                    {lang === "bn" ? "ওয়েবসাইট দেখুন" : "View website"}
                  </a>
                  <button type="button" role="menuitem" onClick={() => { toggleLang(); setMoreOpen(false); }} className={MENU_ITEM}>
                    <span className={chip(TONE.lang)}><Languages className="w-4 h-4" /></span>
                    {lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
                  </button>
                  <button type="button" role="menuitem" onClick={() => { void handleRefresh(); setMoreOpen(false); }} disabled={isRefreshing} className={MENU_ITEM}>
                    <span className={chip(TONE.refresh)}><RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} /></span>
                    {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
                  </button>
                  <div className="px-1.5 pt-1.5 pb-0.5 border-t border-gray-100 dark:border-white/10">
                    <AdminInstallButton showLabel />
                  </div>
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={() => useProfileStore.getState().setOpen(true)} aria-label={lang === "bn" ? "আমার প্রোফাইল খুলুন" : "Open my profile"} title={lang === "bn" ? "আমার প্রোফাইল" : "My profile"}
            className="flex items-center gap-2 sm:pl-2 sm:border-l border-gray-100 dark:border-white/10 min-h-11 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 px-1 transition-colors">
            <AdminAvatar name={adminName} className="w-9 h-9 sm:w-8 sm:h-8 text-xs" />
            <span className="hidden md:block text-right leading-tight">
              <span className="block text-xs font-semibold text-gray-900 max-w-[120px] truncate">{adminName}</span>
              <span className="block text-[10px] text-gray-500 capitalize">{adminRole === "super_admin" ? "মালিক" : adminRole ?? "admin"}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
