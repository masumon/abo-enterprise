import { useEffect, useState } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/apiBase";

let cache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

async function fetchSettings(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (pending) return pending;
  pending = axios
    .get<{ data: Record<string, string> }>(`${getApiBaseUrl()}/api/v1/settings`, { timeout: 30000 })
    .then((r) => {
      cache = r.data.data ?? {};
      return cache;
    })
    .catch(() => {
      cache = {};
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Fetch public CMS settings (cached). Safe for client components. */
export function usePublicSettings(keys?: string[]) {
  const [settings, setSettings] = useState<Record<string, string>>(cache ?? {});
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let active = true;
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
