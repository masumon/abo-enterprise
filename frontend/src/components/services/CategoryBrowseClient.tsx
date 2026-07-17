"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { Service, Subcategory } from "@/types";
import { servicesApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import ServiceCard from "@/components/services/ServiceCard";
import PageHero from "@/components/ui/PageHero";
import { ServiceCardSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";

interface Props {
  /** Root-first chain of taxonomy nodes; the last entry is the page's node. */
  trail: Subcategory[];
  initialServices: Service[];
  initialTotal: number;
}

const PER_PAGE = 12;

function chipClass(active: boolean): string {
  return cn(
    "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors",
    active
      ? "bg-brand-600 text-white border-brand-600"
      : "bg-white dark:bg-white/5 text-heading border-gray-200 dark:border-white/10 hover:border-brand-400"
  );
}

/**
 * Taxonomy browsing at any depth. The chips link one level deeper; the
 * breadcrumb walks back up. The service grid shows everything under the
 * current node (the API filter includes all descendants).
 */
export default function CategoryBrowseClient({ trail, initialServices, initialTotal }: Props) {
  const { lang } = useLanguageStore();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const node = trail[trail.length - 1];
  const name = (n: Subcategory) => (lang === "bn" && n.name_bn ? n.name_bn : n.name_en);
  const pathFor = (i: number) => `/services/${trail.slice(0, i + 1).map((n) => n.slug).join("/")}`;
  const nodePath = pathFor(trail.length - 1);
  const description =
    (lang === "bn" ? node.description_bn : node.description_en) ?? undefined;
  const children = (node.subcategories ?? []).filter((s) => s.is_active !== false);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await servicesApi.list({
          category_slug: node.slug,
          page: pageNum,
          per_page: PER_PAGE,
        });
        setServices(res.data.data ?? []);
        setTotal(res.data.meta?.total ?? 0);
        setPage(pageNum);
      } catch {
        // keep the current list; pagination simply doesn't advance
      } finally {
        setLoading(false);
      }
    },
    [node.slug]
  );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="services"
        imageUrl={node.image_url ?? trail[0]?.image_url ?? undefined}
        title={name(node)}
        subtitle={description}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          ...trail.map((n, i) =>
            i === trail.length - 1 ? { label: name(n) } : { label: name(n), href: pathFor(i) }
          ),
        ]}
      />

      <section className="enterprise-section-alt">
        <div className="container mx-auto px-4 max-w-6xl">
          {children.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                {lang === "bn" ? "আরও নির্দিষ্ট করুন" : "Browse deeper"}
              </h2>
              <div className="flex flex-wrap gap-2">
                <span className={chipClass(true)}>{lang === "bn" ? "সব" : "All"}</span>
                {children.map((sub) => (
                  <Link key={sub.id} href={`${nodePath}/${sub.slug}`} className={chipClass(false)}>
                    {name(sub)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-16 enterprise-card p-8">
              <p className="text-muted mb-4">
                {lang === "bn"
                  ? "এই ক্যাটাগরিতে এখনো কোনো সেবা যোগ করা হয়নি।"
                  : "No services have been added to this category yet."}
              </p>
              <Link href="/contact" className="btn btn-brand btn-md">
                {lang === "bn" ? "যোগাযোগ করুন" : "Contact Us"}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted mb-4">
                {total} {lang === "bn" ? "টি সেবা" : "services"}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => (
                  <ServiceCard key={s.id} service={s} lang={lang} categoryLabel={name(trail[0])} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-3 mt-10">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => load(page - 1)}
                    className="btn btn-outline btn-md"
                  >
                    {lang === "bn" ? "আগে" : "Previous"}
                  </button>
                  <span className="px-4 py-2 text-sm text-muted self-center">
                    {lang === "bn" ? `পৃষ্ঠা ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => load(page + 1)}
                    className="btn btn-outline btn-md"
                  >
                    {lang === "bn" ? "পরে" : "Next"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
