import { getNetworkQuality, isConstrainedNetwork, isOffline } from "@/lib/networkStatus";
import { offlineSync } from "@/lib/offlineSync";

interface RequestOptions {
  timeout?: number;
  maxRetries?: number;
  cache?: boolean;
  cacheExpiry?: number;
}

/**
 * Get adaptive timeout based on network quality
 * - Fast WiFi: 30s (normal operations)
 * - Slow/Mobile: 60s (allow for latency)
 * - Offline: immediate fail
 */
export function getAdaptiveTimeout(baseTimeout: number = 30000): number {
  const quality = getNetworkQuality();

  if (quality === "offline") {
    return 0; // Don't wait if offline
  }

  if (quality === "slow") {
    return Math.max(baseTimeout * 2, 60000); // 60s for slow networks
  }

  return baseTimeout; // 30s for fast networks
}

/**
 * Get adaptive retry config based on network quality
 */
export function getAdaptiveRetry(baseRetries: number = 3) {
  const quality = getNetworkQuality();

  if (quality === "offline") {
    return 0; // No retries if offline
  }

  if (quality === "slow") {
    return baseRetries + 2; // More retries on slow networks (5 total)
  }

  return baseRetries;
}

/**
 * Should we use cache for this request?
 * - On slow/mobile/offline networks: prefer cache
 * - On fast WiFi: prefer fresh data
 */
export function shouldUseCache(
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET"
): boolean {
  // Only cache GET requests
  if (method !== "GET") return false;

  // Always use cache when offline
  if (isOffline()) return true;

  // Use cache on constrained networks (mobile, slow)
  if (isConstrainedNetwork()) return true;

  return false;
}

/**
 * Get cache expiry time based on network quality
 * - Slow networks: longer cache (24h) to reduce API calls
 * - Fast networks: shorter cache (1h) for freshness
 */
export function getCacheExpiry(): number {
  const quality = getNetworkQuality();

  if (quality === "offline") {
    return 24 * 60; // 24 hours offline
  }

  if (quality === "slow") {
    return 24 * 60; // 24 hours for slow networks
  }

  return 60; // 1 hour for fast networks
}

/**
 * Wrap API calls with network awareness
 * - Use cache on slow networks
 * - Adaptive timeouts
 * - Better error messages for network issues
 */
export async function networkAwareRequest<T>(
  fetchFn: () => Promise<T>,
  cacheKey?: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    cache = shouldUseCache("GET"),
    cacheExpiry = getCacheExpiry(),
  } = options;

  // Try to use cache first if on constrained network
  if (cache && cacheKey) {
    try {
      const cached = await offlineSync.getCachedData(cacheKey);
      if (cached) {
        console.log(`[Cache] Using cached data for ${cacheKey}`);
        return cached;
      }
    } catch (err) {
      console.warn(`[Cache] Failed to read cache:`, err);
    }
  }

  // Try to fetch fresh data
  try {
    const data = await fetchFn();

    // Cache successful responses
    if (cache && cacheKey) {
      try {
        await offlineSync.cacheData(cacheKey, data, cacheExpiry);
      } catch (err) {
        console.warn(`[Cache] Failed to cache data:`, err);
      }
    }

    return data;
  } catch (error) {
    // If fetch fails and we have a cache, use it
    if (cache && cacheKey) {
      try {
        const cached = await offlineSync.getCachedData(cacheKey);
        if (cached) {
          console.warn(
            `[Cache] Network failed, falling back to cache for ${cacheKey}`
          );
          return cached;
        }
      } catch (cacheErr) {
        console.warn(`[Cache] Failed to read fallback cache:`, cacheErr);
      }
    }

    throw error;
  }
}

/**
 * Log network quality for debugging
 */
export function logNetworkStatus(): void {
  const quality = getNetworkQuality();
  const isConstrained = isConstrainedNetwork();
  const isOff = isOffline();

  console.log(
    `[Network] Quality: ${quality} | Constrained: ${isConstrained} | Offline: ${isOff} | Timeout: ${getAdaptiveTimeout()}ms`
  );
}
