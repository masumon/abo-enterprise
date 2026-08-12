"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ImageOff } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import GlassCard from "@/components/ui/GlassCard";
import { servicesApi } from "@/lib/api";
import type { Service } from "@/types";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
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
    <section className="py-5 lg:py-7 bg-white dark:bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-end justify-between gap-4 mb-6 sm:mb-8 lg:mb-10">
          <div>
            <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-brand-600 to-fuchsia-600 bg-clip-text text-transparent mb-1">
              {lang === "bn" ? "সেবা" : "Services"}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-heading tracking-tight leading-tight">
              {lang === "bn" ? "আমাদের সেবাসমূহ" : "Our Services"}
            </h2>
          </div>
          <Link href="/services" className="group inline-flex items-center gap-1.5 flex-shrink-0 rounded-full border border-[var(--line)] bg-white dark:bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-300 shadow-sm hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5 transition-all whitespace-nowrap">
            {lang === "bn" ? "সব সেবা" : "View all"}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {services.map((service) => {
              const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;
              const desc =
                (lang === "bn" ? service.short_description_bn : null) ||
                service.short_description_en ||
                service.description_en;
              const imageSrc = service.featured_image_url?.trim() || null;
              return (
                <div key={service.id ?? service.slug} className="h-full">
                  <Link href={serviceHref(service.slug)} className="group block h-full">
                    <GlassCard hover className="overflow-hidden h-full flex flex-col rounded-2xl sm:rounded-3xl group-hover:shadow-xl group-hover:shadow-brand-500/10 group-hover:-translate-y-1.5 transition-all duration-300">
                      <div className="relative h-32 sm:h-44 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt={name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500" aria-label={lang === "bn" ? "ছবি উপলভ্য নয়" : "Image unavailable"}>
                            <ImageOff className="w-10 h-10" aria-hidden />
                          </div>
                        )}
                        {/* Subtle scrim so a chip/title over any image stays legible. */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                        {service.category && (
                          <span className="absolute top-2 left-2 inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white bg-black/45 backdrop-blur-sm rounded-full">
                            {service.category}
                          </span>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-sm sm:text-lg text-heading mb-1.5 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
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
