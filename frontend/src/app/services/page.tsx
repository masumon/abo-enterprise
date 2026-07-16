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
  const [{ services, total, isDemo }, categories] = await Promise.all([
    fetchServices(),
    fetchServiceTaxonomy(),
  ]);
  return (
    <ServicesPageClient
      initialServices={services}
      initialTotal={total}
      initialIsDemo={isDemo}
      initialCategories={categories}
    />
  );
}
