"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Briefcase, Users,
  LogOut, ExternalLink, BarChart2, Download, Settings, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",            icon: LayoutDashboard, label: "Dashboard",  exact: true },
  { href: "/admin/products",   icon: Package,         label: "Products" },
  { href: "/admin/orders",     icon: ShoppingCart,    label: "Orders" },
  { href: "/admin/bookings",   icon: Briefcase,       label: "Bookings" },
  { href: "/admin/leads",      icon: Users,           label: "Leads" },
  { href: "/admin/analytics",  icon: BarChart2,       label: "Analytics" },
  { href: "/admin/settings",   icon: Settings,        label: "Settings" },
];

interface Props {
  onLogout: () => void;
  adminName?: string;
}

export default function AdminSidebar({ onLogout, adminName = "Admin" }: Props) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-gray-900 flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">ABO Enterprise</p>
            <p className="text-gray-400 text-[10px]">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              isActive(href, exact)
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/10 pt-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          View Website
        </a>

        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 bg-brand-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{adminName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{adminName}</p>
            <p className="text-gray-500 text-[10px]">Super Admin</p>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
