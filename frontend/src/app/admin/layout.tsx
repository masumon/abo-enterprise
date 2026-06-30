"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import ToastProvider from "@/components/ui/ToastProvider";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAdmin(pathname !== "/admin/login");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAdminPolling(pathname !== "/admin/login");

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen admin-auth-loading flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">যাচাই করছি…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen admin-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden backdrop-blur-sm"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        onLogout={logout}
        adminName={user.name}
        adminRole={user.role}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64 min-h-screen flex flex-col">
        <AdminTopBar
          adminName={user.name}
          adminRole={user.role}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="admin-page-container">{children}</div>
        </main>
      </div>

      <ToastProvider />
    </div>
  );
}
