import type { Metadata } from "next";
import { Suspense } from "react";
import type { Product } from "@/types";
import ProductsPageShell from "./ProductsPageShell";
import { getApiBaseUrl } from "@/lib/apiBase";
import { pageMeta } from "@/lib/metadata";

const API_BASE = getApiBaseUrl();
const VALID_CATEGORIES = new Set(["accessories", "gadgets", "electronics", "computer"]);

async function fetchProducts(category?: string): Promise<{ products: Product[]; total: number }> {
  const cat = category && VALID_CATEGORIES.has(category) ? category : undefined;
  const qs = new URLSearchParams({ page: "1", per_page: "20" });
  if (cat) qs.set("category", cat);

  try {
    const res = await fetch(`${API_BASE}/api/v1/products?${qs}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) return { products: [], total: 0 };
    const json = await res.json();
    return {
      products: (json.data ?? []) as Product[],
      total: json.meta?.total ?? 0,
    };
  } catch {
    return { products: [], total: 0 };
  }
}

export const metadata: Metadata = pageMeta(
  "Products — Mobile Accessories & Gadgets",
  "Browse quality mobile accessories, gadgets and electronics at the best prices in Bangladesh.",
  "/products"
);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category ?? "";
  const { products, total } = await fetchProducts(category);

  return (
    <main className="min-h-screen">
      <Suspense fallback={<div className="py-24 text-center text-muted" aria-busy="true">Loading...</div>}>
        <ProductsPageShell
          initialProducts={products}
          initialTotal={total}
          initialCategory={category}
        />
      </Suspense>
    </main>
  );
}
