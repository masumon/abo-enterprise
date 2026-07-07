"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Printer, Scale, Code2, Megaphone, Briefcase,
  ArrowRight, Bot, Cog, Smartphone,
} from "lucide-react";
import type { Service } from "@/types";
import { useLanguageStore } from "@/store/language";
import ServiceCard from "@/components/services/ServiceCard";
import ServiceFilters from "@/components/services/ServiceFilters";
import PageHero from "@/components/ui/PageHero";
import { ServiceCardSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";
import DemoModeBanner from "@/components/ui/DemoModeBanner";
import type { CatalogSource } from "@/lib/catalogLoader";
import { loadServices, peekCachedServices } from "@/lib/catalogLoader";
import { cacheApiResponse, servicesCacheKey } from "@/lib/apiCache";

const FEATURED = [
  {
    icon: Printer,
    title: { en: "Printing Services", bn: "প্রিন্টিং সেবা" },
    subtitle: { en: "Professional quality, fast turnaround", bn: "পেশাদার মান, দ্রুত ডেলিভারি" },
    href: "/services/printing",
    color: "bg-brand-600",
  },
  {
    icon: Scale,
    title: { en: "Legal Assistance", bn: "আইনি সহায়তা" },
    subtitle: { en: "Government documents & legal filings", bn: "সরকারি ডকুমেন্ট ও আইনি কাজ" },
    href: "/services/legal",
    color: "bg-accent-500",
  },
  {
    icon: Code2,
    title: { en: "Software Development", bn: "সফটওয়্যার ডেভেলপমেন্ট" },
    subtitle: { en: "Web, mobile & enterprise solutions", bn: "ওয়েব, মোবাইল ও এন্টারপ্রাইজ সমাধান" },
    href: "/services/software",
    color: "bg-green-600",
  },
];

interface Props {
  initialServices: Service[];
  initialTotal: number;
  initialIsDemo?: boolean;
}

export default function ServicesPageClient({
  initialServices,
  initialTotal,
  initialIsDemo = false,
}: Props) {
  const { lang } = useLanguageStore();
  const t = (o: { en: string; bn: string }) => (lang === "bn" ? o.bn : o.en);

  const [services, setServices] = useState<Service[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [catalogSource, setCatalogSource] = useState<CatalogSource>("api");
  const skipInitial = useRef(!initialIsDemo && initialServices.length > 0);

  useEffect(() => {
    if (!initialIsDemo && initialServices.length > 0) {
      cacheApiResponse(
        servicesCacheKey({ page: 1, per_page: 12 }),
        { services: initialServices, total: initialTotal }
      ).catch(() => {});
    }
  }, [initialIsDemo, initialServices, initialTotal]);

  const categories = [
    { id: null, label: lang === "bn" ? "সব" : "All", en: "All" },
    ...Array.from(
      new Set([...initialServices, ...services].map((s) => s.category).filter(Boolean))
    ).map((c) => ({
      id: c!,
      label: c!,
      en: c!,
    })),
  ];

  const load = useCallback(async (pageNum: number, cat: string | null) => {
    setLoading(true);
    setError(false);

    const params = { category: cat || undefined, page: pageNum, per_page: 12 };

    if (pageNum === 1) {
      const cached = await peekCachedServices(params);
      if (cached) {
        setServices(cached.services);
        setTotal(cached.total);
        setCatalogSource(cached.source);
        setLoading(false);
      }
    }

    try {
      const result = await loadServices(params);
      setServices(result.services);
      setTotal(result.total);
      setCatalogSource(result.source);
      setPage(pageNum);
    } catch {
      const cached = await peekCachedServices(params);
      if (cached) {
        setServices(cached.services);
        setTotal(cached.total);
        setCatalogSource(cached.source);
        setError(false);
      } else {
        setError(true);
        setCatalogSource("api");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitial.current && category === null) {
      skipInitial.current = false;
      if (!initialIsDemo && initialServices.length > 0) return;
    }
    load(1, category);
  }, [category, load, initialIsDemo, initialServices.length]);

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="services"
        title={t({ en: "Our Services", bn: "আমাদের সেবা" })}
        subtitle={t({
          en: "From printing to legal help to full-stack software — everything under one roof.",
          bn: "প্রিন্টিং থেকে আইনি সহায়তা ও সফটওয়্যার — সব এক ছাদের নিচে।",
        })}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services" },
        ]}
      />

      <section className="enterprise-section-alt">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl font-bold text-heading mb-6">{t({ en: "Printing, Legal & Digital Services", bn: "প্রিন্টিং, আইনি ও ডিজিটাল সেবা" })}</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {FEATURED.map(({ icon: Icon, title, subtitle, href, color }) => (
              <Link key={href} href={href} className="enterprise-card-hover p-5 block group">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white", color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-heading mb-1 group-hover:text-brand-600 transition-colors">{t(title)}</h3>
                <p className="text-sm text-muted mb-3">{t(subtitle)}</p>
                <span className="text-sm font-semibold text-brand-600 inline-flex items-center gap-1">
                  {t({ en: "Explore", bn: "দেখুন" })} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-heading">{t({ en: "All Services", bn: "সব সেবা" })}</h2>
            <ServiceFilters categories={categories} selectedCategory={category} onCategoryChange={setCategory} />
          </div>

          <DemoModeBanner show={catalogSource === "cache" && !loading} source={catalogSource} />

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-16 enterprise-card p-8" role="alert">
              <p className="text-muted mb-4">{lang === "bn" ? "সেবা লোড করা যায়নি" : "Could not load services"}</p>
              <button type="button" onClick={() => load(1, category)} className="btn btn-brand btn-md">
                {lang === "bn" ? "আবার চেষ্টা" : "Retry"}
              </button>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 text-muted">
              {lang === "bn" ? "কোনো সেবা পাওয়া যায়নি" : "No services found"}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted mb-4">{total} {lang === "bn" ? "টি সেবা" : "services"}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} lang={lang} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-3 mt-10">
                  <button type="button" disabled={page === 1} onClick={() => load(page - 1, category)} className="btn btn-outline btn-md">
                    {lang === "bn" ? "আগে" : "Previous"}
                  </button>
                  <span className="px-4 py-2 text-sm text-muted self-center">
                    {lang === "bn" ? `পৃষ্ঠা ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
                  </span>
                  <button type="button" disabled={page >= totalPages} onClick={() => load(page + 1, category)} className="btn btn-outline btn-md">
                    {lang === "bn" ? "পরে" : "Next"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="py-12 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">{t({ en: "Powered by Modern Technology", bn: "আধুনিক প্রযুক্তিতে পরিচালিত" })}</h2>
          <div className="flex justify-center gap-6 flex-wrap mt-6">
            {[Bot, Code2, Cog, Smartphone, Megaphone, Briefcase].map((Icon, i) => (
              <div key={i} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                <Icon className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-medium">{["AI", "Web", "Automation", "Mobile", "Marketing", "Consulting"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
