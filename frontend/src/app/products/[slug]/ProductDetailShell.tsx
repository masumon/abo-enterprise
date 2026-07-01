"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { Product } from "@/types";
import { useLanguageStore } from "@/store/language";
import ProductDetailClient from "./ProductDetailClient";
import { cacheProduct, loadProductBySlug, peekCachedProduct } from "@/lib/catalogLoader";

interface Props {
  slug: string;
  initialProduct: Product | null;
}

export default function ProductDetailShell({ slug, initialProduct }: Props) {
  const { lang } = useLanguageStore();
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);

  useEffect(() => {
    if (initialProduct) {
      cacheProduct(initialProduct).catch(() => {});
      return;
    }

    peekCachedProduct(slug).then((cached) => {
      if (cached) {
        setProduct(cached);
        setLoading(false);
      }
    });

    loadProductBySlug(slug)
      .then(({ product: p }) => {
        if (p) setProduct(p);
      })
      .finally(() => setLoading(false));
  }, [slug, initialProduct]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" aria-hidden />
        <p className="text-sm text-muted">{lang === "bn" ? "পণ্য লোড হচ্ছে..." : "Loading product..."}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-32 px-4">
        <p className="text-heading font-semibold mb-2">
          {lang === "bn" ? "পণ্য পাওয়া যায়নি" : "Product not found"}
        </p>
        <p className="text-muted text-sm mb-6">
          {lang === "bn"
            ? "পণ্যটি খুঁজে পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।"
            : "This product could not be found. Please try again."}
        </p>
        <Link href="/products" className="btn btn-brand btn-md">
          {lang === "bn" ? "সব পণ্য দেখুন" : "Browse products"}
        </Link>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}
