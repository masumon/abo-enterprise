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

function serviceHref(slug: string): string {
  if (slug === "software") return "/services/software";
  return `/services/${slug}`;
}

export default function ServicesOverview() {
  const { lang } = useLanguageStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesApi
      .list({ per_page: 6, page: 1 })
      .then((r) => setServices((r.data.data ?? []).slice(0, 6)))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="services" className="py-16">
      <div className="container mx-auto px-4">
        <div className="section-title text-center mb-10">
          <h2>{lang === "bn" ? "মূল সেবাসমূহ" : "Core Services"}</h2>
          <div className="section-divider" />
          <p className="text-gray-500 text-sm max-w-lg mx-auto">
            {lang === "bn"
              ? "আমাদের প্রধান সেবা — প্রতিটি কার্ড আপনার ব্যবসার জন্য প্রাসঙ্গিক সমাধান।"
              : "Our core services — each card shows a solution tailored to your business."}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service) => {
              const name = lang === "bn" && service.name_bn ? service.name_bn : service.name_en;
              const desc =
                (lang === "bn" ? service.short_description_bn : null) ||
                service.short_description_en ||
                service.description_en;
              return (
                <Link key={service.id ?? service.slug} href={serviceHref(service.slug)} className="group">
                  <GlassCard hover className="overflow-hidden h-full">
                    {service.featured_image_url && (
                      <div className="relative h-36 bg-gray-100">
                        <Image
                          src={service.featured_image_url}
                          alt={name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width:768px) 100vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      {service.category && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 rounded-full mb-2">
                          {service.category}
                        </span>
                      )}
                      <h3 className="font-bold text-heading mb-2 group-hover:text-brand-600 transition-colors">
                        {name}
                      </h3>
                      {desc && (
                        <p className="text-gray-500 text-sm mb-4 leading-relaxed line-clamp-2">{desc}</p>
                      )}
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
                        {lang === "bn" ? "বিস্তারিত" : "Learn more"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
