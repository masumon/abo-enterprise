import { getApiBaseUrl } from "@/lib/apiBase";
import type { PromoSlide } from "@/types";

/** Server-side public settings (short-lived cache). */
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
      k === "free_delivery_min_amount"
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
