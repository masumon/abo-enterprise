"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Package, Calendar, Briefcase } from "lucide-react";
import api from "@/lib/api";
import { ProductCardSkeleton } from "@/components/common/Skeletons";

interface Result {
  type: "product" | "service" | "project";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  price?: number;
}

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    setLoading(true);

    Promise.allSettled([
      api.get(`/products?search=${encodeURIComponent(q)}&per_page=6`),
      api.get(`/services?search=${encodeURIComponent(q)}&per_page=6`),
    ]).then(([prod, svc]) => {
      const items: Result[] = [];
      if (prod.status === "fulfilled") {
        (prod.value.data.data || []).forEach((p: any) => items.push({
          type: "product", id: p.id,
          title: p.name_en, subtitle: `৳${p.price?.toLocaleString()}`,
          href: `/products`, price: p.price,
        }));
      }
      if (svc.status === "fulfilled") {
        (svc.value.data.data || []).forEach((s: any) => items.push({
          type: "service", id: s.id,
          title: s.name_en, subtitle: s.category,
          href: `/services/${s.slug}`,
        }));
      }
      setResults(items);
      setLoading(false);
    });
  }, [q]);

  const ICONS = { product: Package, service: Calendar, project: Briefcase };
  const COLORS = { product: "text-blue-600 bg-blue-50", service: "text-green-600 bg-green-50", project: "text-purple-600 bg-purple-50" };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {q ? `"${q}" এর ফলাফল` : "Search"}
        </h1>
        {q && <p className="text-gray-500 text-sm mb-6">{results.length} results found</p>}

        {loading ? (
          <div className="grid gap-4">
            {[1,2,3].map(i => <ProductCardSkeleton key={i} />)}
          </div>
        ) : results.length === 0 && q ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">কোনো ফলাফল পাওয়া যায়নি।</p>
            <div className="flex gap-3 justify-center mt-6">
              <Link href="/products" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">সব পণ্য</Link>
              <Link href="/services" className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium">সব সেবা</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(r => {
              const Icon = ICONS[r.type];
              const color = COLORS[r.type];
              return (
                <Link key={r.id + r.type} href={r.href}
                  className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-brand-200 transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.title}</p>
                    <p className="text-sm text-gray-500">{r.subtitle}</p>
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
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
