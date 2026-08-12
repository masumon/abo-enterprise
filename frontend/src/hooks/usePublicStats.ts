import { useEffect, useState } from "react";
import { publicApi } from "@/lib/api";

export interface PublicStats {
  orders: number;
  products: number;
  services: number;
  clients: number;
  projects: number;
  years: number;
  reviews: number;
  average_rating: number | null;
}

let memoryCache: PublicStats | null = null;
let pending: Promise<PublicStats | null> | null = null;

async function fetchStats(): Promise<PublicStats | null> {
  if (memoryCache) return memoryCache;
  if (pending) return pending;

  pending = publicApi
    .stats()
    .then((r) => {
      const data = r.data.data ?? null;
      if (data) memoryCache = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      pending = null;
    });

  return pending;
}

/**
 * Public homepage stats (/api/v1/public/stats), deduped across every
 * simultaneous caller — Hero and ReviewStatsCard both mount on first
 * homepage load and previously issued the exact same request independently.
 */
export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(memoryCache);
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    let active = true;
    fetchStats().then((data) => {
      if (!active) return;
      setStats(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { stats, loading };
}
