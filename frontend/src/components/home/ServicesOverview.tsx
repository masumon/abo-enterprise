"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";
import { servicesApi } from "@/lib/api";
import type { Service } from "@/types";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import { resolveServiceImage } from "@/lib/demoImages";
import Reveal from "@/components/ui/Reveal";

function serviceHref(slug: string): string {
  if (slug === "software") return "/services/software";
  return `/services/${slug}`;
}

// Homepage priority order for featured services, matched by keywords in the
// service category/name: Digital Services → Software Lab → Business Software → AI.
const SERVICE_PRIORITY: { keywords: string[] }[] = [
  { keywords: ["digital", "passport", "nid", "bkash", "nagad", "print", "birth"] },
  { keywords: ["software lab", "flash", "firmware", "frp", "repair", "recovery", "windows", "driver"] },
  { keywords: ["business", "pos", "erp", "iptv", "isp", "billing"] },
  { keywords: ["ai", "automation"] },
];

function servicePriority(service: Service): number {
  const haystack = `${service.category ?? ""} ${service.name_en ?? ""}`.toLowerCase();
  const idx = SERVICE_PRIORITY.findIndex((group) =>
    group.keywords.some((kw) => haystack.includes(kw))
  );
  return idx === -1 ? SERVICE_PRIORITY.length : idx;
}

function prioritizeServices(items: Service[]): Service[] {
  return [...items].sort((a, b) => servicePriority(a) - servicePriority(b));
}

export default function ServicesOverview() {
  const { lang } = useLanguageStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesApi
      .list({ per_page: 12, page: 1 })
      .then((r) => setServices(prioritizeServices(r.data.data ?? []).slice(0, 4)))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="services" className="py-12 lg:py-16 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-baseline justify-between gap-4 mb-8 lg:mb-12">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-heading">
            {lang === "bn" ? "আমাদের সেবাসমূহ" : "Our Services"}
          </h2>
          <Link href="/services" className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-300 whitespace-nowrap">
            {lang === "bn" ? "সব সেবা দেখুন →" : "View all services →"}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {services.map((service, i) => {
              const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;
              const desc =
                (lang === "bn" ? service.short_description_bn : null) ||
                service.short_description_en ||
                service.description_en;
              const imageSrc = resolveServiceImage(service.featured_image_url, service.slug);
              return (
                <div key={service.id ?? service.slug} className="h-full">
                  <Link href={serviceHref(service.slug)} className="group block h-full">
                    <GlassCard hover className="overflow-hidden h-full flex flex-col">
                      <div className="relative h-32 sm:h-40 bg-gray-100 dark:bg-gray-800">
                        <Image
                          src={imageSrc}
                          alt={name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
                        />
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-1">
                        {service.category && (
                          <span className="inline-block px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 dark:bg-brand-500/10 rounded-full mb-2 w-fit">
                            {service.category}
                          </span>
                        )}
                        <h3 className="font-bold text-sm sm:text-base text-heading mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                          {name}
                        </h3>
                        {desc && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-3 leading-relaxed line-clamp-2 flex-1">{desc}</p>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 group-hover:gap-2 transition-all w-fit">
                          {lang === "bn" ? "বিস্তারিত দেখুন" : "Learn more"}
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </span>
                      </div>
                    </GlassCard>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
