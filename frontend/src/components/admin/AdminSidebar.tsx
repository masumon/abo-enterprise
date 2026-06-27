"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Briefcase, Users,
  LogOut, ExternalLink, BarChart2, Settings, Wrench, FileText, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",            icon: LayoutDashboard, label: "Dashboard",  exact: true },
  { href: "/admin/orders",     icon: ShoppingCart,    label: "Orders" },
  { href: "/admin/bookings",   icon: Briefcase,       label: "Bookings" },
  { href: "/admin/products",   icon: Package,         label: "Products" },
  { href: "/admin/leads",      icon: Users,           label: "Leads" },
  { href: "/admin/services",   icon: Wrench,          label: "Services" },
  { href: "/admin/invoices",   icon: FileText,        label: "Invoices" },
  { href: "/admin/reviews",    icon: Star,            label: "Reviews" },
  { href: "/projects",         icon: ExternalLink,    label: "Projects", external: true },
  { href: "/admin/analytics",  icon: BarChart2,       label: "Analytics" },
  { href: "/admin/settings",   icon: Settings,        label: "Settings" },
  { href: "/admin/users",      icon: Users,           label: "Users" },
  { href: "/admin/audit",      icon: BarChart2,       label: "Audit Logs" },
];

interface Props {
  onLogout: () => void;
  adminName?: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ onLogout, adminName = "Admin", mobileOpen = false, onClose }: Props) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: "rgba(10,16,35,0.97)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
      }}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/50">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">ABO Enterprise</p>
            <p className="text-gray-500 text-[10px] font-medium tracking-wide">ADMIN PANEL</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label, exact, external }) => {
          const active = !external && isActive(href, exact);
          const className = cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
            active
              ? "bg-brand-600/90 text-white shadow-lg shadow-brand-900/30"
              : "text-gray-400 hover:bg-white/[0.07] hover:text-gray-200"
          );
          if (external) {
            return (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={className}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </a>
            );
          }
          return (
            <Link key={href} href={href} onClick={onClose} className={className}>
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform duration-150", active ? "scale-110" : "")} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 bg-white/60 rounded-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/[0.06] pt-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-white/[0.07] hover:text-gray-200 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          View Website
        </a>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] mt-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-xs font-bold">{adminName[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{adminName}</p>
            <p className="text-gray-500 text-[10px] font-medium">Super Admin</p>
          </div>
          <button
            onClick={onLogout}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
