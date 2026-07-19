"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Printer, Code2, Megaphone, Briefcase,
  Bot, Cog, Smartphone, FileText, Wrench, Monitor, Globe, Headphones, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { Category, Service } from "@/types";
import { useLanguageStore } from "@/store/language";
import ServiceCard from "@/components/services/ServiceCard";
import ServiceFilters from "@/components/services/ServiceFilters";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import { ServiceCardSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";
import DemoModeBanner from "@/components/ui/DemoModeBanner";
import type { CatalogSource } from "@/lib/catalogLoader";
import { loadServices, peekCachedServices } from "@/lib/catalogLoader";
import { cacheApiResponse, servicesCacheKey } from "@/lib/apiCache";

/**
 * The seven service groups ABO Enterprise offers. Rendered as a static
 * catalogue above the live (API-driven) service list so visitors can see the
 * full breadth of the business at a glance. The `anchor` ids are the jump
 * targets used by the homepage Quick Categories cards.
 */
const SERVICE_GROUPS = [
  {
    anchor: "digital-services",
    icon: FileText,
    color: "bg-emerald-600",
    title: { en: "Digital Services", bn: "ডিজিটাল সেবা" },
    items: [
      { en: "Passport", bn: "পাসপোর্ট" },
      { en: "NID", bn: "NID" },
      { en: "Birth Registration", bn: "জন্ম নিবন্ধন" },
      { en: "Online Application", bn: "অনলাইন আবেদন" },
      { en: "bKash", bn: "বিকাশ" },
      { en: "Nagad", bn: "নগদ" },
      { en: "Recharge", bn: "রিচার্জ" },
    ],
  },
  {
    anchor: "print-documentation",
    icon: Printer,
    color: "bg-brand-600",
    title: { en: "Print & Documentation", bn: "প্রিন্ট ও ডকুমেন্টেশন" },
    items: [
      { en: "Printing", bn: "প্রিন্টিং" },
      { en: "Photocopy", bn: "ফটোকপি" },
      { en: "Scan", bn: "স্ক্যান" },
      { en: "Lamination", bn: "ল্যামিনেশন" },
      { en: "Typing", bn: "টাইপিং" },
    ],
  },
  {
    anchor: "software-lab",
    icon: Wrench,
    color: "bg-orange-600",
    title: { en: "Mobile Software Lab", bn: "মোবাইল সফটওয়্যার ল্যাব" },
    items: [
      { en: "Android Flash", bn: "অ্যান্ড্রয়েড ফ্ল্যাশ" },
      { en: "Firmware", bn: "ফার্মওয়্যার" },
      { en: "Apple ID", bn: "অ্যাপল আইডি" },
      { en: "FRP", bn: "FRP" },
      { en: "Data Recovery", bn: "ডেটা রিকভারি" },
      { en: "Software Repair", bn: "সফটওয়্যার রিপেয়ার" },
    ],
  },
  {
    anchor: "computer-software",
    icon: Monitor,
    color: "bg-cyan-600",
    title: { en: "Computer Software", bn: "কম্পিউটার সফটওয়্যার" },
    items: [
      { en: "Windows Install", bn: "উইন্ডোজ ইন্সটল" },
      { en: "Driver Install", bn: "ড্রাইভার ইন্সটল" },
      { en: "Office Install", bn: "অফিস ইন্সটল" },
      { en: "Virus Removal", bn: "ভাইরাস রিমুভাল" },
      { en: "PC Optimization", bn: "পিসি অপটিমাইজেশন" },
    ],
  },
  {
    anchor: "business-software",
    icon: Briefcase,
    color: "bg-indigo-600",
    title: { en: "Business Software", bn: "বিজনেস সফটওয়্যার" },
    items: [
      { en: "POS", bn: "POS" },
      { en: "ERP", bn: "ERP" },
      { en: "IPTV", bn: "IPTV" },
      { en: "ISP Billing", bn: "ISP বিলিং" },
    ],
  },
  {
    anchor: "ai-solutions",
    icon: Bot,
    color: "bg-purple-600",
    title: { en: "AI Solutions", bn: "AI সমাধান" },
    items: [
      { en: "AI Assistant", bn: "AI অ্যাসিস্ট্যান্ট" },
      { en: "Automation", bn: "অটোমেশন" },
      { en: "Custom AI", bn: "কাস্টম AI" },
      { en: "Business AI", bn: "বিজনেস AI" },
    ],
  },
  {
    anchor: "web-software",
    icon: Globe,
    color: "bg-sky-600",
    title: { en: "Web & Software", bn: "ওয়েব ও সফটওয়্যার" },
    items: [
      { en: "Website", bn: "ওয়েবসাইট" },
      { en: "Web App", bn: "ওয়েব অ্যাপ" },
      { en: "Custom Software", bn: "কাস্টম সফটওয়্যার" },
    ],
  },
  {
    anchor: "it-support",
    icon: Headphones,
    color: "bg-rose-600",
    title: { en: "Business & IT Support", bn: "বিজনেস ও আইটি সাপোর্ট" },
    items: [
      { en: "Networking", bn: "নেটওয়ার্কিং" },
      { en: "CCTV", bn: "CCTV" },
      { en: "PC & Printer Servicing", bn: "পিসি ও প্রিন্টার সার্ভিসিং" },
      { en: "Maintenance", bn: "রক্ষণাবেক্ষণ" },
      { en: "AMC Support", bn: "AMC সাপোর্ট" },
    ],
  },
];

/** Maps the icon name stored on a DB category to a Lucide component. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  FileText, Printer, Globe, Smartphone, Headphones, Megaphone,
  Briefcase, Bot, Cog, Wrench, Monitor, Code2,
};

/** Rotating accents for DB-driven category cards (same palette as the static groups). */
const CATEGORY_COLORS = [
  "bg-emerald-600", "bg-brand-600", "bg-sky-600", "bg-orange-600",
  "bg-rose-600", "bg-pink-600", "bg-indigo-600", "bg-purple-600", "bg-cyan-600",
];

/**
 * Navbar/Footer/MegaMenu/QuickCategories deep-link to /services#<legacy-anchor>.
 * The live cards use DB slugs as ids, so each card also exposes its legacy
 * anchor(s) as invisible jump targets to keep every existing link working.
 */
const LEGACY_ANCHOR_ALIASES: Record<string, string[]> = {
  "digital-e-services": ["digital-services"],
  "printing-documentation": ["print-documentation"],
  "mobile-lab": ["software-lab"],
  "it-support": ["computer-software"],
  "business-consultancy": ["business-software"],
  "ai-automation": ["ai-solutions"],
};

/** One shape for both the live (DB) cards and the static fallback cards. */
interface CategoryCardModel {
  key: string;
  anchorId: string;
  extraAnchorIds: string[];
  Icon: LucideIcon;
  color: string;
  title: string;
  /** Set on live cards only — title/chips become links into the nested routes. */
  titleHref?: string;
  chips: { key: string; label: string; href?: string }[];
}

interface Props {
  initialServices: Service[];
  initialTotal: number;
  initialIsDemo?: boolean;
  /** Live taxonomy (Category → Subcategory) from the API; falls back to the static groups when empty. */
  initialCategories?: Category[];
}

export default function ServicesPageClient({
  initialServices,
  initialTotal,
  initialIsDemo = false,
  initialCategories = [],
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

  // Normalize live DB categories (or the static fallback) into one card model.
  const categoryCards: CategoryCardModel[] =
    initialCategories.length > 0
      ? initialCategories.map((cat, i) => ({
          key: cat.id,
          anchorId: cat.slug,
          extraAnchorIds: LEGACY_ANCHOR_ALIASES[cat.slug] ?? [],
          Icon: (cat.icon && CATEGORY_ICONS[cat.icon]) || Cog,
          color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          title: lang === "bn" && cat.name_bn ? cat.name_bn : cat.name_en,
          titleHref: `/services/${cat.slug}`,
          chips: (cat.subcategories ?? [])
            .filter((s) => s.is_active !== false)
            .map((s) => ({
              key: s.id,
              label: lang === "bn" && s.name_bn ? s.name_bn : s.name_en,
              href: `/services/${cat.slug}/${s.slug}`,
            })),
        }))
      : SERVICE_GROUPS.map((g) => ({
          key: g.anchor,
          anchorId: g.anchor,
          extraAnchorIds: [],
          Icon: g.icon,
          color: g.color,
          title: t(g.title),
          chips: g.items.map((item) => ({ key: item.en, label: t(item) })),
        }));

  // One classification system everywhere: the filter chips reuse the same live
  // taxonomy as the category cards above (bilingual names, filtered via
  // category_slug). The legacy flat service.category strings remain only as a
  // fallback when the taxonomy is empty/unreachable.
  const usingTaxonomy = initialCategories.length > 0;
  const categories = [
    { id: null, label: lang === "bn" ? "সব" : "All", en: "All" },
    ...(usingTaxonomy
      ? initialCategories.map((c) => ({
          id: c.slug,
          label: lang === "bn" && c.name_bn ? c.name_bn : c.name_en,
          en: c.name_en,
        }))
      : Array.from(
          new Set([...initialServices, ...services].map((s) => s.category).filter(Boolean))
        ).map((c) => ({
          id: c!,
          label: c!,
          en: c!,
        }))),
  ];

  // Taxonomy names for the tag on each service card (falls back to the raw
  // legacy category string inside ServiceCard when a service is unassigned).
  const categoryLabelById = new Map(
    initialCategories.map((c) => [c.id, lang === "bn" && c.name_bn ? c.name_bn : c.name_en])
  );

  const load = useCallback(async (pageNum: number, cat: string | null) => {
    setLoading(true);
    setError(false);

    const params = {
      ...(usingTaxonomy ? { category_slug: cat || undefined } : { category: cat || undefined }),
      page: pageNum,
      per_page: 12,
    };

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
  }, [usingTaxonomy]);

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
          en: "Digital services, mobile & computer software, business software, AI, web development and IT support — all under one roof.",
          bn: "ডিজিটাল সেবা, মোবাইল ও কম্পিউটার সফটওয়্যার, বিজনেস সফটওয়্যার, AI, ওয়েব ডেভেলপমেন্ট ও আইটি সাপোর্ট — সব এক ছাদের নিচে।",
        })}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services" },
        ]}
      />

      <section className="enterprise-section-alt">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-xl font-bold text-heading mb-2">{t({ en: "What We Offer", bn: "আমরা যা দিই" })}</h2>
          <p className="text-sm text-muted mb-6">{t({ en: "Digital services, software lab, business software & AI — all under one roof.", bn: "ডিজিটাল সেবা, সফটওয়্যার ল্যাব, বিজনেস সফটওয়্যার ও AI — সব এক ছাদের নিচে।" })}</p>
          {/* One renderer for both sources: live DB taxonomy (cards/chips are
              links into the nested routes) or the static fallback when the
              taxonomy is empty/unreachable. */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {categoryCards.map(({ key, anchorId, extraAnchorIds, Icon, color, title, titleHref, chips }, i) => {
              const iconTile = (
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md ring-1 ring-white/25 group-hover/card:scale-110 group-hover/card:-rotate-3 transition-transform duration-300",
                    color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
              );
              return (
                <Reveal
                  as="div"
                  key={key}
                  delay={Math.min(i, 6) * 70}
                  className="h-full"
                >
                  <div
                    id={anchorId}
                    className="group/card enterprise-card p-5 scroll-mt-24 relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(30,91,168,0.35)]"
                  >
                    {/* Coloured top accent that grows on hover — premium touch */}
                    <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1 opacity-80 transition-opacity duration-300 group-hover/card:opacity-100", color)} />
                    {/* Invisible legacy anchors so old /services#... links keep scrolling here */}
                    {extraAnchorIds.map((a) => (
                      <span key={a} id={a} aria-hidden className="absolute top-0 scroll-mt-24" />
                    ))}
                    {titleHref ? (
                      <Link href={titleHref} className="flex items-center gap-3 mb-3 group/title">
                        {iconTile}
                        <h3 className="font-bold text-heading group-hover/title:text-brand-600 transition-colors">{title}</h3>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 mb-3">
                        {iconTile}
                        <h3 className="font-bold text-heading">{title}</h3>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {chips.map((chip) =>
                        chip.href ? (
                          <Link
                            key={chip.key}
                            href={chip.href}
                            className="group/chip inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 text-xs font-semibold rounded-full text-brand-700 dark:text-brand-200 bg-gradient-to-b from-white to-brand-50/80 dark:from-white/[0.07] dark:to-brand-900/30 ring-1 ring-brand-100 dark:ring-brand-800/70 shadow-sm shadow-brand-900/[0.05] hover:-translate-y-0.5 hover:ring-brand-300 dark:hover:ring-brand-600 hover:shadow-md hover:shadow-brand-900/10 hover:text-brand-800 dark:hover:text-white transition-all duration-200"
                          >
                            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 group-hover/chip:from-brand-500 group-hover/chip:to-brand-700 transition-colors" />
                            {chip.label}
                            <ChevronRight aria-hidden className="w-3 h-3 -ml-1 opacity-0 -translate-x-1 group-hover/chip:opacity-100 group-hover/chip:translate-x-0 transition-all" />
                          </Link>
                        ) : (
                          <span
                            key={chip.key}
                            className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 text-xs font-semibold rounded-full text-brand-700 dark:text-brand-200 bg-gradient-to-b from-white to-brand-50/80 dark:from-white/[0.07] dark:to-brand-900/30 ring-1 ring-brand-100 dark:ring-brand-800/70 shadow-sm shadow-brand-900/[0.05]"
                          >
                            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
                            {chip.label}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
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
                  <ServiceCard
                    key={s.id}
                    service={s}
                    lang={lang}
                    categoryLabel={s.category_id ? categoryLabelById.get(s.category_id) : undefined}
                  />
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
