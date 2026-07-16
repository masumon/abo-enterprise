"use client";

import PageHero from "@/components/ui/PageHero";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import ProductsClient from "./ProductsClient";
import type { Category, Product } from "@/types";

// Legacy string categories — fallback when the taxonomy is empty/unreachable.
const VALID_CATEGORIES = new Set(["accessories", "gadgets", "electronics", "computer"]);

interface Props {
  initialProducts: Product[];
  initialTotal: number;
  initialCategory?: string;
  initialIsDemo?: boolean;
  /** Live product taxonomy (Category → Subcategory) for the filter chips. */
  initialCategories?: Category[];
}

export default function ProductsPageShell({
  initialProducts,
  initialTotal,
  initialCategory = "",
  initialIsDemo = false,
  initialCategories = [],
}: Props) {
  const { lang } = useLanguageStore();
  const t = useT();
  // A category param is honored when it names a taxonomy category or one of
  // the legacy hardcoded values; anything else falls back to "All".
  const category =
    initialCategory &&
    (initialCategories.some((c) => c.slug === initialCategory) || VALID_CATEGORIES.has(initialCategory))
      ? initialCategory
      : "";

  return (
    <>
      <PageHero
        pageKey="products"
        title={t("products_title")}
        subtitle={t("products_sub")}
        breadcrumbs={[
          { label: lang === "bn" ? "হোম" : "Home", href: "/" },
          { label: lang === "bn" ? "পণ্য" : "Products" },
        ]}
      />
      <ProductsClient
        initialProducts={initialProducts}
        initialTotal={initialTotal}
        initialCategory={category}
        initialIsDemo={initialIsDemo}
        initialCategories={initialCategories}
      />
    </>
  );
}
