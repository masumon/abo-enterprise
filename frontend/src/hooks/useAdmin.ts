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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cachedUser: AdminUser | null = null;
let cacheExpiry = 0;

function getCached(): AdminUser | null {
  if (cachedUser && Date.now() < cacheExpiry) return cachedUser;
  return null;
}

function setCache(user: AdminUser) {
  cachedUser = user;
  cacheExpiry = Date.now() + CACHE_TTL_MS;
}

function clearCache() {
  cachedUser = null;
  cacheExpiry = 0;
}

export function useAdmin(redirectOnFail = true) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(getCached);
  const [loading, setLoading] = useState(!getCached());

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("abo_admin_token");
    if (!token) {
      if (redirectOnFail) router.replace("/admin/login");
      setLoading(false);
      return;
    }

    const cached = getCached();
    if (cached) {
      setUser(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      const adminUser = res.data.data as AdminUser;
      setCache(adminUser);
      setUser(adminUser);
    } catch {
      clearCache();
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
    clearCache();
    localStorage.removeItem("abo_admin_token");
    router.replace("/admin/login");
  }, [router]);

  return { user, loading, logout };
}
