import { offlineSync } from "@/lib/offlineSync";

const PREFIX = "api:";

export async function cacheApiResponse<T>(
  key: string,
  data: T,
  expiryMinutes = 24 * 60
): Promise<void> {
  try {
    await offlineSync.cacheData(`${PREFIX}${key}`, data, expiryMinutes);
  } catch {
    // IndexedDB may be unavailable in private mode — ignore
  }
}

export async function getCachedApiResponse<T>(key: string): Promise<T | null> {
  try {
    return await offlineSync.getCachedData(`${PREFIX}${key}`);
  } catch {
    return null;
  }
}

export function productsCacheKey(params: Record<string, unknown>): string {
  return `products:${JSON.stringify(params)}`;
}

export function servicesCacheKey(params: Record<string, unknown>): string {
  return `services:${JSON.stringify(params)}`;
}

export function productCacheKey(slug: string): string {
  return `product:${slug}`;
}

export const SETTINGS_CACHE_KEY = "settings:public";
