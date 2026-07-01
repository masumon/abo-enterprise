import type { Product, Service } from "@/types";
import { DEMO_PRODUCTS, DEMO_SERVICES } from "@/lib/demoContent";

let settingsCache: Record<string, string> | null = null;

/** Called by usePublicSettings when settings load — enables admin overrides. */
export function setDemoSettings(settings: Record<string, string>) {
  settingsCache = settings;
}

export function isDemoFallbackEnabled(): boolean {
  const v = settingsCache?.demo_fallback_enabled;
  if (v === "false" || v === "0") return false;
  return true;
}

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw?.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function getDemoProducts(): Product[] {
  return parseJsonArray(settingsCache?.demo_products_json, DEMO_PRODUCTS);
}

export function getDemoServices(): Service[] {
  return parseJsonArray(settingsCache?.demo_services_json, DEMO_SERVICES);
}

export function filterDemoProducts(
  products: Product[],
  opts?: { category?: string; search?: string; featured?: boolean }
): Product[] {
  let list = [...products];
  if (opts?.featured) list = list.filter((p) => p.is_featured);
  if (opts?.category) list = list.filter((p) => p.category === opts.category);
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name_en.toLowerCase().includes(q) ||
        p.name_bn.includes(opts.search!) ||
        p.slug.includes(q)
    );
  }
  return list;
}

export function filterDemoServices(services: Service[], category?: string | null): Service[] {
  if (!category) return [...services];
  return services.filter((s) => s.category === category);
}

export function isDemoProduct(productId: string): boolean {
  return productId.startsWith("demo-");
}

export function getDemoNotice(lang: "en" | "bn"): string | null {
  const key = lang === "bn" ? "demo_notice_bn" : "demo_notice_en";
  const custom = settingsCache?.[key]?.trim();
  if (custom) return custom;
  return lang === "bn"
    ? "ধীর নেটওয়ার্ক — ডেমো কন্টেন্ট দেখানো হচ্ছে। অর্ডার দিতে ইন্টারনেট সংযোগ দিয়ে আবার চেষ্টা করুন।"
    : "Slow connection — showing demo content. Connect to the internet and retry to place orders.";
}

export function getCachedNotice(lang: "en" | "bn"): string {
  return lang === "bn"
    ? "সংরক্ষিত ক্যাটালগ দেখানো হচ্ছে — সর্বশেষ দামের জন্য ইন্টারনেটে সংযুক্ত হোন।"
    : "Showing saved catalog — connect to the internet for latest prices.";
}
