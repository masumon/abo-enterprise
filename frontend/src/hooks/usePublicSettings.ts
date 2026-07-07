import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/apiBase";
import { cacheApiResponse, getCachedApiResponse, SETTINGS_CACHE_KEY } from "@/lib/apiCache";
import { isOffline } from "@/lib/networkStatus";

let memoryCache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

async function loadCachedSettings(): Promise<Record<string, string> | null> {
  return getCachedApiResponse<Record<string, string>>(SETTINGS_CACHE_KEY);
}

async function fetchSettings(): Promise<Record<string, string>> {
  if (memoryCache) return memoryCache;

  const cached = await loadCachedSettings();
  if (cached && Object.keys(cached).length > 0) {
    memoryCache = cached;
    if (isOffline()) return cached;
  }

  if (pending) return pending;

  pending = axios
    .get<{ data: Record<string, string> }>(`${getApiBaseUrl()}/api/v1/settings`, {
      timeout: isOffline() ? 5000 : 60000,
    })
    .then(async (r) => {
      memoryCache = r.data.data ?? {};
      await cacheApiResponse(SETTINGS_CACHE_KEY, memoryCache, 7 * 24 * 60);
      return memoryCache;
    })
    .catch(async (err) => {
      console.warn("public_settings_fetch_failed", err);
      if (cached && Object.keys(cached).length > 0) return cached;
      memoryCache = {};
      return memoryCache;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/** Fetch public CMS settings (memory + IndexedDB cache). Safe for client components. */
export function usePublicSettings(keys?: string[]) {
  const [settings, setSettings] = useState<Record<string, string>>(memoryCache ?? {});
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    let active = true;

    loadCachedSettings().then((cached) => {
      if (!active || !cached || Object.keys(cached).length === 0) return;
      memoryCache = cached;
      if (keys?.length) {
        const subset: Record<string, string> = {};
        for (const k of keys) subset[k] = cached[k] ?? "";
        setSettings(subset);
      } else {
        setSettings(cached);
      }
      setLoading(false);
    });

    fetchSettings().then((data) => {
      if (!active) return;
      if (keys?.length) {
        const subset: Record<string, string> = {};
        for (const k of keys) subset[k] = data[k] ?? "";
        setSettings(subset);
      } else {
        setSettings(data);
      }
      setLoading(false);
    });

    return () => { active = false; };
  }, [keys?.join(",")]);

  return { settings, loading };
}

export function getSettingValue(
  settings: Record<string, string>,
  key: string,
  fallback = ""
): string {
  const v = settings[key];
  return v && v !== "***HIDDEN***" ? v : fallback;
}
