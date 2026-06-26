"use client";

import { useAdmin } from "@/hooks/useAdmin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAdmin();

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
      <AdminSidebar onLogout={logout} adminName={user.name} />
      <div className="pl-60">
        <main className="min-h-screen p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
