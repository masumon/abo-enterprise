import type { Metadata } from "next";
import type { Product } from "@/types";
import Link from "next/link";
import ProductsClient from "./ProductsClient";
import { getApiBaseUrl } from "@/lib/apiBase";
import { pageMeta } from "@/lib/metadata";

const API_BASE = getApiBaseUrl();

export const metadata: Metadata = pageMeta(
  "Products — Mobile Accessories & Gadgets",
  "Browse quality mobile accessories, gadgets and electronics at the best prices in Bangladesh.",
  "/products"
);

async function fetchProducts(): Promise<{ products: Product[]; total: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products?page=1&per_page=20`, {
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

export default async function ProductsPage() {
  const { products, total } = await fetchProducts();

  return (
    <main className="min-h-screen">
      <section className="gradient-brand text-white py-14 md:py-16 px-4 -mt-[var(--navbar-offset)] pt-[calc(var(--navbar-offset)+3.5rem)]">
        <div className="max-w-6xl mx-auto">
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-xs sm:text-sm mb-4 text-white/70">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <span className="text-white">Products</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Our Products</h1>
          <p className="text-brand-100 text-lg">Quality accessories & electronics at the best prices</p>
        </div>
      </section>
      <ProductsClient initialProducts={products} initialTotal={total} />
    </main>
  );
}
