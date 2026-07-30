import type { Metadata } from "next";
import type { Category, Service } from "@/types";
import { pageMeta } from "@/lib/metadata";
import { getApiBaseUrl } from "@/lib/apiBase";
import ServicesPageClient from "./ServicesPageClient";
import { fetchWithRetry } from "@/lib/fetchRetry";

export const metadata: Metadata = pageMeta(
  "Services — Digital, Software Lab, Business Software & AI",
  "Digital services (Passport, NID, bKash), mobile & computer software lab, business software (POS, ERP, IPTV, ISP billing), AI solutions and web development from ABO Enterprise, Bangladesh.",
  "/services"
);

async function fetchServices(): Promise<{ services: Service[]; total: number; isDemo: boolean }> {
  try {
    const res = await fetchWithRetry(`${getApiBaseUrl()}/api/v1/services?page=1&per_page=12`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const services = (json.data ?? []) as Service[];
    return { services, total: json.meta?.total ?? services.length, isDemo: false };
  } catch (err) {
    console.error("services_page_initial_fetch_failed", err);
  }
  return { services: [], total: 0, isDemo: false };
}

/**
 * Screen 08 — the shortlist at the top of the hub. Sourced from the services
 * the admin has marked featured: the shop knows what people walk in asking for,
 * and this is them saying so. It is curation, not a statistic — nothing here
 * counts anything, which is why the section never claims a number.
 */
async function fetchFeaturedServices(): Promise<Service[]> {
  try {
    const res = await fetchWithRetry(
      `${getApiBaseUrl()}/api/v1/services?page=1&per_page=3&featured=true`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(55000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as Service[];
  } catch {
    // The hub must not depend on this call; an empty list renders nothing.
    return [];
  }
}

async function fetchServiceTaxonomy(): Promise<Category[]> {
  try {
    const res = await fetchWithRetry(`${getApiBaseUrl()}/api/v1/categories?applies_to=service`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? []) as Category[];
  } catch (err) {
    console.error("services_page_taxonomy_fetch_failed", err);
    return [];
  }
}

export default async function ServicesPage() {
  const [{ services, total, isDemo }, categories, featured] = await Promise.all([
    fetchServices(),
    fetchServiceTaxonomy(),
    fetchFeaturedServices(),
  ]);
  return (
    <ServicesPageClient
      initialServices={services}
      initialTotal={total}
      initialIsDemo={isDemo}
      initialCategories={categories}
      featuredServices={featured}
    />
  );
}
