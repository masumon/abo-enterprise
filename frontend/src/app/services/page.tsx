import type { Metadata } from "next";
import type { Service } from "@/types";
import { pageMeta } from "@/lib/metadata";
import { getApiBaseUrl } from "@/lib/apiBase";
import ServicesPageClient from "./ServicesPageClient";

export const metadata: Metadata = pageMeta(
  "Services — Printing, Legal & Software",
  "Professional printing, legal assistance, software development and enterprise solutions from ABO Enterprise, Bangladesh.",
  "/services"
);

async function fetchServices(): Promise<{ services: Service[]; total: number }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/services?page=1&per_page=12`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) return { services: [], total: 0 };
    const json = await res.json();
    return {
      services: (json.data ?? []) as Service[],
      total: json.meta?.total ?? 0,
    };
  } catch {
    return { services: [], total: 0 };
  }
}

export default async function ServicesPage() {
  const { services, total } = await fetchServices();
  return <ServicesPageClient initialServices={services} initialTotal={total} />;
}
