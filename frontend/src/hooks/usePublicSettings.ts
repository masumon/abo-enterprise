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

/**
 * Fetch public CMS settings with stale-while-revalidate behaviour.
 *
 * Online: always request the current server state so an admin CMS update
 * (especially images/banners) is visible after a page refresh/navigation.
 * Offline: use the last IndexedDB/memory cache.
 *
 * The previous implementation returned memoryCache before making a network
 * request. Because the cache can live for 7 days, an admin image change could
 * remain invisible on the public site until the cache expired.
 */
async function fetchSettings(): Promise<Record<string, string>> {
  if (pending) return pending;

  const cached = await loadCachedSettings();

  if (isOffline()) {
    if (memoryCache && Object.keys(memoryCache).length > 0) return memoryCache;
    return cached ?? {};
  }

  pending = axios
    .get<{ data: Record<string, string> }>(`${getApiBaseUrl()}/api/v1/settings`, {
      timeout: 60000,
    })
    .then(async (r) => {
      memoryCache = r.data.data ?? {};
      await cacheApiResponse(SETTINGS_CACHE_KEY, memoryCache, 7 * 24 * 60);
      return memoryCache;
    })
    .catch(async (err) => {
      console.warn("public_settings_fetch_failed", err);
      if (memoryCache && Object.keys(memoryCache).length > 0) return memoryCache;
      if (cached && Object.keys(cached).length > 0) {
        memoryCache = cached;
        return cached;
      }
      memoryCache = {};
      return memoryCache;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/** Fetch public CMS settings (stale cache + background revalidation). Safe for client components. */
export function usePublicSettings(keys?: string[]) {
  const [settings, setSettings] = useState<Record<string, string>>(memoryCache ?? {});
  const [loading, setLoading] = useState(!memoryCache);
  // A joined string, not the `keys` array itself: callers often pass an
  // inline array literal (e.g. usePublicSettings(["x"])), a new reference
  // every render, which would re-run this effect every render if `keys`
  // were the dependency. The string only changes when the actual key
  // values change.
  const keysDepKey = keys?.join(",");

  useEffect(() => {
    let active = true;

    // Show cached settings immediately for fast rendering/offline support.
    // The cache is intentionally NOT authoritative while online.
    loadCachedSettings().then((cached) => {
      if (!active || !cached || Object.keys(cached).length === 0) return;
      if (isOffline()) {
        memoryCache = cached;
        if (keys?.length) {
          const subset: Record<string, string> = {};
          for (const k of keys) subset[k] = cached[k] ?? "";
          setSettings(subset);
        } else {
          setSettings(cached);
        }
        setLoading(false);
      }
    });

    // Online this always revalidates against the API, replacing stale cached
    // CMS values with the latest values saved by the admin.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see keysDepKey comment above
  }, [keysDepKey]);

  return { settings, loading };
}

export { getSettingValue } from "@/lib/settingValue";
