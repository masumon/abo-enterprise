import type { Metadata } from "next";
import { Suspense } from "react";
import type { Category, Product } from "@/types";
import ProductsPageShell from "./ProductsPageShell";
import { getApiBaseUrl } from "@/lib/apiBase";
import { pageMeta, jsonLdString } from "@/lib/metadata";
import { fetchWithRetry } from "@/lib/fetchRetry";
import { SITE_URL } from "@/lib/tokens";

const API_BASE = getApiBaseUrl();
// Legacy string categories — kept as fallback when the taxonomy is empty or
// unreachable, so old ?category= links and offline visits keep working.
const VALID_CATEGORIES = new Set(["accessories", "gadgets", "electronics", "computer"]);

async function fetchProductTaxonomy(): Promise<Category[]> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/api/v1/categories?applies_to=product`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(55000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data ?? []) as Category[];
  } catch (err) {
    console.error("products_page_taxonomy_fetch_failed", err);
    return [];
  }
}

async function fetchProducts(
  category: string | undefined,
  taxonomySlugs: Set<string>
): Promise<{ products: Product[]; total: number; isDemo: boolean }> {
  const qs = new URLSearchParams({ page: "1", per_page: "20" });
  // Taxonomy slug wins (DB-driven chips); legacy strings keep old links alive.
  if (category && taxonomySlugs.has(category)) qs.set("category_slug", category);
  else if (category && VALID_CATEGORIES.has(category)) qs.set("category", category);

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
  const categories = await fetchProductTaxonomy();
  const taxonomySlugs = new Set(categories.map((c) => c.slug));
  const { products, total, isDemo } = await fetchProducts(category || undefined, taxonomySlugs);

  // L9 — a product listing with no ItemList markup gives search engines no
  // structured signal of what's on the page beyond plain text.
  const itemListJsonLd = products.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/products/${p.slug}`,
      name: p.name_en,
    })),
  } : null;

  return (
    <main className="min-h-screen">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(itemListJsonLd) }}
        />
      )}
      <Suspense fallback={<div className="py-24 text-center text-muted" aria-busy="true">Loading...</div>}>
        <ProductsPageShell
          initialProducts={products}
          initialTotal={total}
          initialCategory={category}
          initialIsDemo={isDemo}
          initialCategories={categories}
        />
      </Suspense>
    </main>
  );
}
