import { useEffect, useState } from "react";
import { networkAwareRequest } from "@/lib/networkAwareApi";

interface UseNetworkAwareApiOptions {
  cache?: boolean;
  cacheExpiry?: number;
  enabled?: boolean;
}

/**
 * Hook for network-aware API requests with automatic caching
 *
 * Usage:
 * ```tsx
 * const { data, loading, error } = useNetworkAwareApi(
 *   () => productsApi.list(),
 *   "products-list",
 *   { cache: true, cacheExpiry: 60 }
 * );
 * ```
 */
export function useNetworkAwareApi<T>(
  fetchFn: () => Promise<T>,
  cacheKey?: string,
  options: UseNetworkAwareApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { cache = true, cacheExpiry = 60, enabled = true } = options;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await networkAwareRequest(fetchFn, cacheKey, {
          cache,
          cacheExpiry,
        });

        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchFn, cacheKey, cache, cacheExpiry, enabled]);

  return { data, loading, error };
}
