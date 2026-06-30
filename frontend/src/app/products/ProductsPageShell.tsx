"use client";

import PageHero from "@/components/ui/PageHero";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import ProductsClient from "./ProductsClient";
import type { Product, ProductCategory } from "@/types";

const VALID_CATEGORIES = new Set(["accessories", "gadgets", "electronics", "computer"]);

function parseCategory(value?: string): ProductCategory | "" {
  if (!value || !VALID_CATEGORIES.has(value)) return "";
  return value as ProductCategory;
}

interface Props {
  initialProducts: Product[];
  initialTotal: number;
  initialCategory?: string;
  initialIsDemo?: boolean;
}

export default function ProductsPageShell({
  initialProducts,
  initialTotal,
  initialCategory = "",
  initialIsDemo = false,
}: Props) {
  const { lang } = useLanguageStore();
  const t = useT();
  const category = parseCategory(initialCategory);

  return (
    <>
      <PageHero
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
      />
    </>
  );
}
