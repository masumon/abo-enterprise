"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, ExternalLink, Search, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlertStore } from "@/store/alerts";
import {
  ADMIN_EXTERNAL_LINKS,
  ADMIN_NAV_GROUPS,
  canSeeNavItem,
  type AdminNavItem,
  type AdminRole,
} from "@/lib/adminNav";

interface Props {
  onLogout: () => void;
  adminName?: string;
  adminRole?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  onLogout,
  adminName = "Admin",
  adminRole = "admin",
  mobileOpen = false,
  onClose,
}: Props) {
  const pathname = usePathname();
  const { pendingOrders, pendingBookings, newLeads } = useAlertStore();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const badgeCount = (key?: string) => {
    if (key === "orders") return pendingOrders;
    if (key === "bookings") return pendingBookings;
    if (key === "leads") return newLeads;
    return 0;
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const filterText = query.trim().toLowerCase();

  const role = (adminRole as AdminRole | undefined);
  const filteredGroups = useMemo(() => {
    // First hide items the current role can't use, then apply the search text.
    const rolescoped = ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeNavItem(item, role)),
    })).filter((g) => g.items.length > 0);
    if (!filterText) return rolescoped;
    return rolescoped
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(filterText) ||
            item.labelBn?.toLowerCase().includes(filterText),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [filterText, role]);

  const renderNavItem = (item: AdminNavItem) => {
    const active = !item.external && isActive(item.href, item.exact);
    const count = badgeCount(item.badge);
    const Icon = item.icon;
    const linkClass = cn(
      "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150",
      active
        ? "bg-brand-600 text-white shadow-md shadow-brand-900/25"
        : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-100"
    );

    const content = (
      <>
        <Icon className={cn("w-4 h-4 flex-shrink-0", active && "scale-105")} />
        <span className="flex-1 truncate">{item.label}</span>
        {count > 0 && (
          <span
            className={cn(
              "ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold",
              active ? "bg-white/20 text-white" : "bg-red-500 text-white"
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </>
    );

    if (item.external) {
      return (
        <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {content}
        </a>
      );
    }

    return (
      <Link key={item.href} href={item.href} onClick={onClose} className={linkClass}>
        {content}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 admin-sidebar",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-700 rounded-xl flex items-center justify-center shadow-lg">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">ABO Enterprise</p>
            <p className="text-gray-500 text-[10px] font-medium tracking-wider">ADMIN</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="মেনু খুঁজুন…"
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30"
          />
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto admin-sidebar-scroll space-y-4">
        {filteredGroups.map((group) => {
          const isCollapsed = collapsed[group.id];
          const hasActive = group.items.some((item) => !item.external && isActive(item.href, item.exact));

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => setCollapsed((p) => ({ ...p, [group.id]: !p[group.id] }))}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors",
                  hasActive ? "text-brand-300" : "text-gray-500 hover:text-gray-400"
                )}
              >
                <span>{group.labelBn ?? group.label}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isCollapsed && "-rotate-90")} />
              </button>
              {!isCollapsed && (
                <div className="mt-0.5 space-y-0.5">{group.items.map(renderNavItem)}</div>
              )}
            </div>
          );
        })}

        {!filterText && (
          <div>
            <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              লিংক
            </p>
            <div className="space-y-0.5">
              {ADMIN_EXTERNAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-white/[0.06] hover:text-gray-200 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    {item.labelBn ?? item.label}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/[0.04]">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{adminName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{adminName}</p>
            <p className="text-gray-500 text-[10px] capitalize">{adminRole}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
