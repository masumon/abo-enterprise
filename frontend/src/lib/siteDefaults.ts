/** @deprecated Import from @/lib/maps instead */
export { DEFAULT_MAPS_EMBED } from "@/lib/maps";

/**
 * Optional fallback values for homepage statistics.
 *
 * Zero means there is no trustworthy fallback source. The UI renders an
 * unavailable state rather than presenting a fabricated business number.
 * Real values are supplied by /public/stats when available.
 */
export const MARKETING_STATS = {
  clients: 0,
  projects: 0,
  products: 0,
  years: 0,
  orders: 0,
  services: 0,
} as const;
