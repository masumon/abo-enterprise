/**
 * Defensive helpers for API responses whose shape may be unexpected
 * (e.g. `[]` or `{}` or `null` instead of the documented object). Admin
 * pages use these so a bad payload renders an empty state instead of
 * crashing the whole panel.
 */

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asObject<T extends object>(value: unknown): Partial<T> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<T>) : {};
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
