"use client";

import { useEffect, useState } from "react";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { aponApi } from "@/lib/aponApi";
import { APON_SETTING_KEYS, flag, type AponInfo } from "@/lib/apon";

let cache: { at: number; info: AponInfo } | null = null;
let inflight: Promise<AponInfo | null> | null = null;
const TTL_MS = 60_000;

async function loadInfo(): Promise<AponInfo | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.info;
  if (!inflight) {
    inflight = Promise.resolve()
      .then(() => aponApi.info())
      .then((r) => {
        const info = r.data.data ?? null;
        if (info) cache = { at: Date.now(), info };
        return info;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Everything the Apon surfaces need: the admin `apon_*` settings plus whether a build is
 * published right now. `visible("show_nav")` is true only when downloads are on AND the
 * admin enabled that particular spot — so every entry point disappears by itself when the
 * app is switched off or has no published build.
 */
export function useAponInfo() {
  const { settings } = usePublicSettings([...APON_SETTING_KEYS]);
  // Always start empty: reading the module cache here would make the first client render differ
  // from the server HTML (a hydration mismatch). The effect below fills it from the cache at once.
  const [info, setInfo] = useState<AponInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void loadInfo().then((i) => {
      if (!alive) return;
      setInfo(i);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const enabled = !!info?.enabled;
  return {
    settings,
    info,
    loading,
    enabled,
    visible: (spot: "nav" | "drawer" | "home" | "footer") => enabled && flag(settings, `apon_show_${spot}`, true),
  };
}
