"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAdmin(redirectOnFail = true) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("abo_admin_token");
    if (!token) {
      if (redirectOnFail) router.replace("/admin/login");
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      setUser(res.data.data as AdminUser);
    } catch {
      localStorage.removeItem("abo_admin_token");
      if (redirectOnFail) router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router, redirectOnFail]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem("abo_admin_token");
    router.replace("/admin/login");
  }, [router]);

  return { user, loading, logout };
}
