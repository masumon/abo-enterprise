"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAdminPageTitle } from "@/lib/adminNav";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminPolling } from "@/hooks/useAdminPolling";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import AdminCommandPalette from "@/components/admin/AdminCommandPalette";
import ToastProvider from "@/components/ui/ToastProvider";
import DynamicFavicon from "@/components/ui/DynamicFavicon";
import { Loader2 } from "lucide-react";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, logout } = useAdmin(pathname !== "/sumon/login");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem("abo_admin_theme") === "dark");
  }, []);

  // The admin PWA manifest is now server-rendered for /sumon routes (see the
  // server layout's `metadata.manifest`), so it is the ONLY manifest Chrome
  // sees here from the first paint — installing from the admin therefore
  // installs the ADMIN app (start_url /sumon), not the customer site. No
  // client-side manifest swap is needed anymore (the old useEffect swap raced
  // beforeinstallprompt and let the customer app get installed instead).

  // Per-page browser tab title — every admin page used to share the site title.
  useEffect(() => {
    if (pathname !== "/sumon/login") {
      document.title = `${getAdminPageTitle(pathname)} · ABO Admin`;
    }
  }, [pathname]);

  const toggleTheme = () => {
    setDark((d) => {
      localStorage.setItem("abo_admin_theme", d ? "light" : "dark");
      return !d;
    });
  };
  useAdminPolling(pathname !== "/sumon/login");

  if (pathname === "/sumon/login") {
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
    <div className={`min-h-screen admin-shell${dark ? " admin-dark" : ""}`}>
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
          dark={dark}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="admin-page-container">{children}</div>
        </main>
      </div>

      <AdminCommandPalette role={user.role} />
      <ToastProvider />
      <DynamicFavicon />
    </div>
  );
}
