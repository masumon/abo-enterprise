import { getApiBaseUrl } from "@/lib/apiBase";
import type { PromoSlide } from "@/types";

/** Server-side public settings (short-lived cache). */
/** Homepage trust figures (server side, so the stats card renders in the first paint). */
export async function fetchPublicStats(): Promise<{ average_rating?: number | null; reviews?: number; orders?: number; products?: number } | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/public/stats`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    return (await res.json())?.data ?? null;
  } catch {
    return null;
  }
}

/** Whether the Apon app has a published build (server side, so the home card never "jumps in"). */
export async function fetchAponEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/app/info`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json?.data?.enabled;
  } catch {
    return false;
  }
}

export async function fetchPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/settings`, {
      // Keep a short cache to reduce Render Free-tier traffic while making
      // admin CMS changes visible much sooner than the previous 5-minute window.
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return {};
    const json = await res.json();
    return json.data ?? {};
  } catch {
    return {};
  }
}

export function settingValue(settings: Record<string, string>, key: string, fallback = ""): string {
  const v = settings[key];
  return v?.trim() ? v.trim() : fallback;
}

/** Keys the above-the-fold hero/banner components need on first paint. */
export function pickHeroSettings(settings: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (
      k.startsWith("hero_") ||
      /^banner_[a-z_]+_image_url$/.test(k) ||
      k === "free_delivery_min_amount" ||
      // Home "projects" band: without this the server HTML showed the built-in sample projects (dead links).
      k === "showcase_projects_json"
    ) {
      out[k] = v;
    }
  }
  return out;
}

/** Server-side promo slides for one placement (60 s cache). null = unknown
 * (API slow/down) so the client falls back to its own fetch. */
export async function fetchPromoSlides(placement: "hero" | "flash_sale"): Promise<PromoSlide[] | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/promo-slides?placement=${placement}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : null;
  } catch {
    return null;
  }
}


/** Generic cached server GET returning `data` as an array, or null when the
 * API is slow/down (the client component then fetches on its own). */
async function fetchList<T>(path: string): Promise<T[] | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json.data) ? (json.data as T[]) : null;
  } catch {
    return null;
  }
}

/** Homepage combo packs, rendered with the HTML (no 3-5 s pop-in). */
export const fetchCombos = <T>() => fetchList<T>("/api/v1/combos");

/** Homepage flash-sale products, rendered with the HTML. */
export const fetchFlashProducts = <T>() => fetchList<T>("/api/v1/products?flash_sale=true&per_page=8&page=1");
