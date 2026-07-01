import type { Product, Service } from "@/types";
import { getApiBaseUrl } from "@/lib/apiBase";
import { DEMO_PRODUCTS, DEMO_SERVICES } from "@/lib/demoContent";

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Server-side: load demo catalog images from CMS settings (seeded in DB). */
export async function fetchDemoProductsFromSettings(): Promise<Product[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/settings`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return DEMO_PRODUCTS;
    const json = await res.json();
    return parseJsonArray<Product>(json.data?.demo_products_json, DEMO_PRODUCTS);
  } catch {
    return DEMO_PRODUCTS;
  }
}

export async function fetchDemoServicesFromSettings(): Promise<Service[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/settings`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return DEMO_SERVICES;
    const json = await res.json();
    return parseJsonArray<Service>(json.data?.demo_services_json, DEMO_SERVICES);
  } catch {
    return DEMO_SERVICES;
  }
}
