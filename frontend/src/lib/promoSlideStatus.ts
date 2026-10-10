import type { PromoSlide } from "@/types";
import { parseDhakaDateTime, toDhakaInputValue } from "@/lib/flashSale";

/** What a visitor sees for one promo slide right now — matches the backend
 * filter (active AND starts_at <= now AND ends_at >= now). */
export type SlideLiveState = "live" | "off" | "scheduled" | "expired";

export function slideLiveState(
  s: Pick<PromoSlide, "is_active" | "starts_at" | "ends_at">,
  now: number = Date.now()
): SlideLiveState {
  if (!s.is_active) return "off";
  const start = s.starts_at ? Date.parse(s.starts_at) : NaN;
  const end = s.ends_at ? Date.parse(s.ends_at) : NaN;
  if (!Number.isNaN(end) && end < now) return "expired";
  if (!Number.isNaN(start) && start > now) return "scheduled";
  return "live";
}

export const SLIDE_STATE_LABEL_BN: Record<SlideLiveState, string> = {
  live: "এখন দেখাচ্ছে",
  off: "বন্ধ",
  scheduled: "পরে শুরু হবে",
  expired: "মেয়াদ শেষ",
};

export const SLIDE_STATE_CLASS: Record<SlideLiveState, string> = {
  live: "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-400/30",
  off: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-white/5 dark:text-gray-400 dark:border-white/10",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-400/30",
  expired: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/30",
};

/** API ISO timestamp → `datetime-local` value in Bangladesh time. */
export function slideIsoToDhakaInput(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : toDhakaInputValue(new Date(t));
}

/** `datetime-local` value (Bangladesh time) → ISO for the API; blank → null. */
export function dhakaInputToIso(local?: string | null): string | null {
  const d = parseDhakaDateTime(local);
  return d ? d.toISOString() : null;
}
