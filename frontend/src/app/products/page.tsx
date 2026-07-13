import type { Metadata } from "next";
import { Suspense } from "react";
import type { Product } from "@/types";
import ProductsPageShell from "./ProductsPageShell";
import { getApiBaseUrl } from "@/lib/apiBase";
import { pageMeta } from "@/lib/metadata";
import { fetchWithRetry } from "@/lib/fetchRetry";

const API_BASE = getApiBaseUrl();
const VALID_CATEGORIES = new Set(["accessories", "gadgets", "electronics", "computer"]);

async function fetchProducts(category?: string): Promise<{ products: Product[]; total: number; isDemo: boolean }> {
  const cat = category && VALID_CATEGORIES.has(category) ? category : undefined;
  const qs = new URLSearchParams({ page: "1", per_page: "20" });
  if (cat) qs.set("category", cat);

  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/products?${qs}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const products = (json.data ?? []) as Product[];
    return { products, total: json.meta?.total ?? products.length, isDemo: false };
  } catch (err) {
    console.error("products_page_initial_fetch_failed", err);
  }
  return { products: [], total: 0, isDemo: false };
}

export const metadata: Metadata = pageMeta(
  "Tech Store — Mobile Accessories, Premium Gadgets & Electronics",
  "Shop premium mobile accessories, gadgets, electronics and computer accessories at the best prices in Bangladesh.",
  "/products"
);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category ?? "";
  const { products, total, isDemo } = await fetchProducts(category);

  return (
    <main className="min-h-screen">
      <Suspense fallback={<div className="py-24 text-center text-muted" aria-busy="true">Loading...</div>}>
        <ProductsPageShell
          initialProducts={products}
          initialTotal={total}
          initialCategory={category}
          initialIsDemo={isDemo}
        />
      </Suspense>
    </main>
  );
}
