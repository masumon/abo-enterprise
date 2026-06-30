import type { Metadata } from "next";
import type { Service } from "@/types";
import { pageMeta } from "@/lib/metadata";
import { getApiBaseUrl } from "@/lib/apiBase";
import ServicesPageClient from "./ServicesPageClient";
import { fetchWithRetry } from "@/lib/fetchRetry";
import { DEMO_SERVICES } from "@/lib/demoContent";

export const metadata: Metadata = pageMeta(
  "Services — Printing, Legal & Software",
  "Professional printing, legal assistance, software development and enterprise solutions from ABO Enterprise, Bangladesh.",
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
    if (services.length > 0) {
      return { services, total: json.meta?.total ?? services.length, isDemo: false };
    }
  } catch {
    // fall through to demo
  }
  return { services: DEMO_SERVICES, total: DEMO_SERVICES.length, isDemo: true };
}

export default async function ServicesPage() {
  const { services, total, isDemo } = await fetchServices();
  return <ServicesPageClient initialServices={services} initialTotal={total} initialIsDemo={isDemo} />;
}
