"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { Category, Service, Subcategory } from "@/types";
import { servicesApi } from "@/lib/api";
import { useLanguageStore } from "@/store/language";
import ServiceCard from "@/components/services/ServiceCard";
import PageHero from "@/components/ui/PageHero";
import { ServiceCardSkeleton } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";

interface Props {
  category: Category;
  /** Present on /services/{categorySlug}/{subCategorySlug} pages. */
  subcategory?: Subcategory;
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
 * Nested taxonomy browsing — category landing and subcategory listing pages.
 * The subcategory chips deep-link into /services/{cat}/{sub}; the grid pulls
 * live services filtered by taxonomy slugs.
 */
export default function CategoryBrowseClient({
  category,
  subcategory,
  initialServices,
  initialTotal,
}: Props) {
  const { lang } = useLanguageStore();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const catName = lang === "bn" && category.name_bn ? category.name_bn : category.name_en;
  const subName = subcategory
    ? lang === "bn" && subcategory.name_bn
      ? subcategory.name_bn
      : subcategory.name_en
    : null;
  const description =
    (lang === "bn"
      ? subcategory?.description_bn ?? category.description_bn
      : subcategory?.description_en ?? category.description_en) ?? undefined;

  const subcategories = (category.subcategories ?? []).filter((s) => s.is_active !== false);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await servicesApi.list({
          category_slug: category.slug,
          subcategory_slug: subcategory?.slug,
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
    [category.slug, subcategory?.slug]
  );

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <main className="min-h-screen">
      <PageHero
        pageKey="services"
        imageUrl={subcategory?.image_url ?? category.image_url ?? undefined}
        title={subName ?? catName}
        subtitle={description}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "সেবা" : "Services", href: "/services" },
          ...(subcategory
            ? [{ label: catName, href: `/services/${category.slug}` }, { label: subName! }]
            : [{ label: catName }]),
        ]}
      />

      <section className="enterprise-section-alt">
        <div className="container mx-auto px-4 max-w-6xl">
          {subcategories.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                {lang === "bn" ? "সাব-ক্যাটাগরি" : "Browse by Subcategory"}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Link href={`/services/${category.slug}`} className={chipClass(!subcategory)}>
                  {lang === "bn" ? "সব" : "All"}
                </Link>
                {subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/services/${category.slug}/${sub.slug}`}
                    className={chipClass(subcategory?.id === sub.id)}
                  >
                    {lang === "bn" && sub.name_bn ? sub.name_bn : sub.name_en}
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
                  <ServiceCard key={s.id} service={s} lang={lang} />
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
