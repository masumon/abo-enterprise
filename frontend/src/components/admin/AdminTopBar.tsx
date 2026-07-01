"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Bell, RotateCw } from "lucide-react";
import { getAdminPageTitle } from "@/lib/adminNav";
import { useAlertStore } from "@/store/alerts";
import { useState } from "react";

interface Props {
  adminName: string;
  adminRole?: string;
  onMenuClick: () => void;
}

export default function AdminTopBar({ adminName, adminRole, onMenuClick }: Props) {
  const pathname = usePathname();
  const pageTitle = getAdminPageTitle(pathname);
  const { pendingOrders, pendingBookings, newLeads } = useAlertStore();
  const alertTotal = pendingOrders + pendingBookings + newLeads;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      window.location.reload();
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
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1" aria-label="Breadcrumb">
          <Link href="/admin" className="text-gray-400 hover:text-brand-600 transition-colors shrink-0">
            Admin
          </Link>
          {pathname !== "/admin" && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
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
          {alertTotal > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-800 text-xs font-medium"
              title="Pending items"
            >
              <Bell className="w-3.5 h-3.5" />
              {alertTotal} pending
            </div>
          )}
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
