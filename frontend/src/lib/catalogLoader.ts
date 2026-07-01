import { productsApi, servicesApi } from "@/lib/api";
import {
  cacheApiResponse,
  getCachedApiResponse,
  productCacheKey,
  productsCacheKey,
  servicesCacheKey,
} from "@/lib/apiCache";
import {
  filterDemoProducts,
  filterDemoServices,
  getDemoProducts,
  getDemoServices,
  isDemoFallbackEnabled,
} from "@/lib/demoFallback";
import { isConstrainedNetwork, isOffline } from "@/lib/networkStatus";
import type { Product, Service } from "@/types";

export type CatalogSource = "api" | "cache" | "demo";

export interface ProductsLoadResult {
  products: Product[];
  total: number;
  source: CatalogSource;
}

export interface ServicesLoadResult {
  services: Service[];
  total: number;
  source: CatalogSource;
}

interface ProductLoadParams {
  category?: string;
  search?: string;
  sort_by?: string;
  featured?: boolean;
  page?: number;
  per_page?: number;
}

interface ServiceLoadParams {
  category?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

/** Shorter timeout + fewer retries on mobile/cellular — fail fast to cache/demo. */
const MOBILE_CATALOG_OPTS = { timeout: 22000, maxRetries: 1 } as const;

async function loadDemoProducts(params: ProductLoadParams): Promise<ProductsLoadResult> {
  const demo = filterDemoProducts(getDemoProducts(), {
    category: params.category,
    search: params.search,
    featured: params.featured,
  });
  return { products: demo, total: demo.length, source: "demo" };
}

async function loadDemoServices(params: ServiceLoadParams): Promise<ServicesLoadResult> {
  const demo = filterDemoServices(getDemoServices(), params.category ?? null);
  return { services: demo, total: demo.length, source: "demo" };
}

/**
 * Load products — stale-while-revalidate on mobile/slow networks.
 * Offline: serve cache only. Online: always try API (shorter timeout on cellular).
 */
export async function loadProducts(params: ProductLoadParams): Promise<ProductsLoadResult> {
  const cacheKey = productsCacheKey(params as Record<string, unknown>);
  const cached = await getCachedApiResponse<{ products: Product[]; total: number }>(cacheKey);

  if (isOffline()) {
    if (cached?.products?.length) {
      return { products: cached.products, total: cached.total, source: "cache" };
    }
    if (params.page === 1 && isDemoFallbackEnabled()) {
      return loadDemoProducts(params);
    }
    throw new Error("products_load_failed");
  }

  const mobileOpts = isConstrainedNetwork() ? MOBILE_CATALOG_OPTS : undefined;

  try {
    const r = await productsApi.list(params, mobileOpts);
    const products = r.data.data ?? [];
    if (products.length > 0) {
      const total = r.data.meta?.total ?? products.length;
      await cacheApiResponse(cacheKey, { products, total });
      return { products, total, source: "api" };
    }
    if (params.page === 1 && isDemoFallbackEnabled()) {
      return loadDemoProducts(params);
    }
    return { products: [], total: 0, source: "api" };
  } catch {
    if (cached?.products?.length) {
      return { products: cached.products, total: cached.total, source: "cache" };
    }
    if (params.page === 1 && isDemoFallbackEnabled()) {
      return loadDemoProducts(params);
    }
    throw new Error("products_load_failed");
  }
}

/** Peek cached products without hitting the network (for instant paint on mobile). */
export async function peekCachedProducts(
  params: ProductLoadParams
): Promise<ProductsLoadResult | null> {
  const cached = await getCachedApiResponse<{ products: Product[]; total: number }>(
    productsCacheKey(params as Record<string, unknown>)
  );
  if (!cached?.products?.length) return null;
  return { products: cached.products, total: cached.total, source: "cache" };
}

/** Load services — stale-while-revalidate on mobile/slow networks. */
export async function loadServices(params: ServiceLoadParams): Promise<ServicesLoadResult> {
  const cacheKey = servicesCacheKey(params as Record<string, unknown>);
  const cached = await getCachedApiResponse<{ services: Service[]; total: number }>(cacheKey);

  if (isOffline()) {
    if (cached?.services?.length) {
      return { services: cached.services, total: cached.total, source: "cache" };
    }
    if (params.page === 1 && isDemoFallbackEnabled()) {
      return loadDemoServices(params);
    }
    throw new Error("services_load_failed");
  }

  const mobileOpts = isConstrainedNetwork() ? MOBILE_CATALOG_OPTS : undefined;

  try {
    const r = await servicesApi.list(params, mobileOpts);
    const services = r.data.data ?? [];
    if (services.length > 0) {
      const total = r.data.meta?.total ?? services.length;
      await cacheApiResponse(cacheKey, { services, total });
      return { services, total, source: "api" };
    }
    if (params.page === 1 && isDemoFallbackEnabled()) {
      return loadDemoServices(params);
    }
    return { services: [], total: 0, source: "api" };
  } catch {
    if (cached?.services?.length) {
      return { services: cached.services, total: cached.total, source: "cache" };
    }
    if (params.page === 1 && isDemoFallbackEnabled()) {
      return loadDemoServices(params);
    }
    throw new Error("services_load_failed");
  }
}

/** Peek cached services without hitting the network. */
export async function peekCachedServices(
  params: ServiceLoadParams
): Promise<ServicesLoadResult | null> {
  const cached = await getCachedApiResponse<{ services: Service[]; total: number }>(
    servicesCacheKey(params as Record<string, unknown>)
  );
  if (!cached?.services?.length) return null;
  return { services: cached.services, total: cached.total, source: "cache" };
}

/** Cache a single product when viewed (for offline product detail). */
export async function cacheProduct(product: Product): Promise<void> {
  if (!product?.slug) return;
  await cacheApiResponse(productCacheKey(product.slug), product, 7 * 24 * 60);
}

/** Peek a cached product by slug. */
export async function peekCachedProduct(slug: string): Promise<Product | null> {
  return getCachedApiResponse<Product>(productCacheKey(slug));
}

/** Load product by slug — cache on success, serve cache when offline or API fails. */
export async function loadProductBySlug(slug: string): Promise<{ product: Product | null; source: CatalogSource }> {
  const cached = await peekCachedProduct(slug);

  if (isOffline()) {
    return { product: cached, source: cached ? "cache" : "api" };
  }

  const mobileOpts = isConstrainedNetwork() ? MOBILE_CATALOG_OPTS : undefined;

  try {
    const r = await productsApi.get(slug, mobileOpts);
    const product = r.data.data ?? null;
    if (product) {
      await cacheProduct(product);
      return { product, source: "api" };
    }
    return { product: cached, source: cached ? "cache" : "api" };
  } catch {
    return { product: cached, source: cached ? "cache" : "api" };
  }
}
