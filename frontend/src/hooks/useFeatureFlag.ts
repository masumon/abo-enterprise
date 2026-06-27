import { useEffect, useState } from "react";
import { publicApi } from "@/lib/api";

type Flags = Record<string, boolean | string>;

const DEFAULTS: Record<string, boolean> = {
  feature_flash_sale: true,
  feature_coupons: true,
  feature_guest_checkout: true,
  feature_newsletter: true,
  feature_infinite_scroll: true,
  feature_assistant_chat: true,
};

let cache: Flags | null = null;

export function useFeatureFlag(key: string, fallback = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(
    cache ? Boolean(cache[key] ?? fallback) : fallback
  );

  useEffect(() => {
    if (cache) {
      setEnabled(Boolean(cache[key] ?? fallback));
      return;
    }
    publicApi.featureFlags()
      .then((r) => {
        cache = r.data.data ?? DEFAULTS;
        setEnabled(Boolean(cache![key] ?? fallback));
      })
      .catch(() => setEnabled(fallback));
  }, [key, fallback]);

  return enabled;
}

export function isFeatureEnabled(key: string, flags?: Flags | null): boolean {
  const source = flags ?? cache ?? DEFAULTS;
  const val = source[key];
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val.toLowerCase() === "true";
  return DEFAULTS[key] ?? true;
}
