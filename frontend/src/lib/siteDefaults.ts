/** @deprecated Import from @/lib/maps instead */
export { DEFAULT_MAPS_EMBED } from "@/lib/maps";

/** Fallback stats shown when /public/stats is unreachable. Kept modest and
 * plausible for a Sylhet-based business — inflated numbers hurt trust more
 * than they help. Real numbers replace these whenever the API responds. */
export const MARKETING_STATS = {
  clients: 200,
  projects: 80,
  products: 8,
  years: 8,
  orders: 120,
  services: 9,
} as const;
