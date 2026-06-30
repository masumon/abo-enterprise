"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Package, Calendar, Briefcase } from "lucide-react";
import api from "@/lib/api";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";

interface Result {
  type: "product" | "service" | "project";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  price?: number;
}

const SERVICE_SLUG_MAP: Record<string, string> = {
  printing: "/services/printing",
  legal: "/services/legal",
  software: "/services/software",
  website: "/services/software",
  "case-writing": "/services/legal",
};

function resolveServiceHref(slug: string, category?: string): string {
  if (SERVICE_SLUG_MAP[slug]) return SERVICE_SLUG_MAP[slug];
  if (category && SERVICE_SLUG_MAP[category]) return SERVICE_SLUG_MAP[category]!;
  return `/services/${slug}`;
}

function SearchResults() {
  const params = useSearchParams();
  const { lang } = useLanguageStore();
  const q = params.get("q") || "";
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);

    Promise.allSettled([
      api.get(`/api/v1/products`, { params: { search: q, per_page: 6 } }),
      api.get(`/api/v1/services`, { params: { search: q, per_page: 6 } }),
    ]).then(([prod, svc]) => {
      const items: Result[] = [];
      if (prod.status === "fulfilled") {
        (prod.value.data.data || []).forEach((p: { id: string; slug: string; name_en: string; name_bn?: string; price?: number }) => items.push({
          type: "product",
          id: p.id,
          title: lang === "bn" && p.name_bn ? p.name_bn : p.name_en,
          subtitle: `৳${p.price?.toLocaleString("bn-BD") ?? "—"}`,
          href: `/products/${p.slug}`,
          price: p.price,
        }));
      }
      if (svc.status === "fulfilled") {
        (svc.value.data.data || []).forEach((s: { id: string; slug: string; name_en: string; name_bn?: string; category?: string }) => items.push({
          type: "service",
          id: s.id,
          title: lang === "bn" && s.name_bn ? s.name_bn : s.name_en,
          subtitle: s.category ?? "",
          href: resolveServiceHref(s.slug, s.category),
        }));
      }
      setResults(items);
      setLoading(false);
    });
  }, [q, lang]);

  const ICONS = { product: Package, service: Calendar, project: Briefcase };
  const COLORS = { product: "text-blue-600 bg-blue-50", service: "text-green-600 bg-green-50", project: "text-purple-600 bg-purple-50" };

  const title = q
    ? lang === "bn" ? `"${q}" এর ফলাফল` : `Results for "${q}"`
    : lang === "bn" ? "খুঁজুন" : "Search";

  return (
    <main className="min-h-screen page-surface">
      <PageHero
        pageKey="search"
        title={title}
        subtitle={q ? (lang === "bn" ? `${results.length}টি ফলাফল` : `${results.length} results found`) : (lang === "bn" ? "পণ্য ও সেবা খুঁজুন" : "Find products and services")}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "খুঁজুন" : "Search" },
        ]}
        variant="light"
      />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            {[1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : results.length === 0 && q ? (
          <div className="text-center py-16 enterprise-card p-8">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted">
              {lang === "bn" ? "কোনো ফলাফল পাওয়া যায়নি।" : "No results found."}
            </p>
            <div className="flex gap-3 justify-center mt-6 flex-wrap">
              <Link href="/products" className="btn btn-brand btn-sm">
                {lang === "bn" ? "সব পণ্য" : "All Products"}
              </Link>
              <Link href="/services" className="btn btn-outline btn-sm">
                {lang === "bn" ? "সব সেবা" : "All Services"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => {
              const Icon = ICONS[r.type];
              const color = COLORS[r.type];
              return (
                <Link
                  key={r.id + r.type}
                  href={r.href}
                  className="flex items-center gap-4 enterprise-card p-4 hover:shadow-md transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-heading truncate">{r.title}</p>
                    <p className="text-sm text-muted">{r.subtitle}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${color}`}>
                    {r.type}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
