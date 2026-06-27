"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Loader2, Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAdmin(pathname !== "/admin/login");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Start global 30s polling once authenticated (no-op on login page)
  useAdminPolling();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(145deg, #f0f4ff 0%, #f8faff 50%, #faf0ff 100%)",
      }}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <AdminSidebar
        onLogout={logout}
        adminName={user.name}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-60">
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <span className="font-semibold text-gray-900 text-sm">ABO Admin</span>
        </div>
        <main className="min-h-screen p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
