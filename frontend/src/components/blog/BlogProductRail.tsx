"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/features/ProductCard";
import { useLanguageStore } from "@/store/language";
import type { Product } from "@/types";

/**
 * GAP-17 — a blog article ended at its last paragraph. The reader who had just
 * spent two minutes on a buying guide was handed no next step, so the only
 * moves left were the back button or the tab close.
 *
 * Products are fetched on the server and passed in, so the rail costs the
 * article no client fetch and disappears entirely when the catalogue call
 * fails. It reuses ProductCard rather than inventing a second product visual,
 * which keeps badges, pricing and add-to-cart behaviour identical to the shop.
 */
export default function BlogProductRail({
  products,
  matched = false,
}: {
  products: Product[];
  matched?: boolean;
}) {
  const { lang } = useLanguageStore();
  if (products.length === 0) return null;

  const heading = matched
    ? lang === "bn" ? "এই বিষয়ে আমাদের পণ্য" : "Related products from our store"
    : lang === "bn" ? "আমাদের স্টোর থেকে" : "From our store";

  return (
    <section className="mt-12 pt-8 border-t border-gray-100 dark:border-white/10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-heading">{heading}</h2>
        <Link
          href="/products"
          className="text-sm font-semibold text-brand-600 hover:underline inline-flex items-center gap-1 flex-shrink-0"
        >
          {lang === "bn" ? "সব পণ্য" : "All products"}
          <ArrowRight aria-hidden className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Rail on phones (the article column is too narrow for a grid), plain
          grid from sm up where there is width for three cards. */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {products.map((p) => (
          <div key={p.id ?? p.slug} className="snap-start flex-shrink-0 w-[15rem] sm:w-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
