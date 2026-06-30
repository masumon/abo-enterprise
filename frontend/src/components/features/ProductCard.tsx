"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Star, Heart, Eye, GitCompare } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { formatPrice, discountPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Badge, { badgeVariantFromProduct } from "@/components/ui/Badge";
import type { Product } from "@/types";

interface Props {
  product: Product;
  onAddToCart?: () => void;
  layout?: "grid" | "list";
}

function productAlt(product: Product, lang: string) {
  return lang === "bn"
    ? `${product.name_bn} — ABO Enterprise`
    : `${product.name_en} — ABO Enterprise`;
}

export default function ProductCard({ product, onAddToCart, layout = "grid" }: Props) {
  const { addItem } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const { add: addCompare, has: isCompared } = useCompareStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const [actionsOpen, setActionsOpen] = useState(false);

  const productId = product.id ?? product.slug;
  const wished = has(productId);
  const discount = product.original_price ? discountPercent(product.original_price, product.price) : null;
  const isOutOfStock = product.stock_quantity === 0;
  const rating = product.rating ?? 4.5;
  const reviewCount = product.review_count ?? 0;
  const alt = productAlt(product, lang);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      product_id: productId,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
    });
    onAddToCart?.();
    toast("success", lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      product_id: productId,
      slug: product.slug,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.image_url,
    });
  };

  if (layout === "list") {
    return (
      <article className="card-hover group flex gap-4 p-4 relative">
        <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-hidden tabIndex={-1} />
        <div className="relative w-28 aspect-square rounded-xl overflow-hidden bg-brand-50 flex-shrink-0">
          {product.image_url ? (
            <Image src={product.image_url} alt={alt} fill className="object-cover" sizes="112px" />
          ) : (
            <Package className="w-10 h-10 text-brand-200 m-auto mt-9" aria-hidden />
          )}
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          {product.category && (
            <Badge variant="outline" className="text-[10px] capitalize mb-1">{product.category}</Badge>
          )}
          <h3 className="font-semibold text-gray-800 line-clamp-2">{lang === "bn" ? product.name_bn : product.name_en}</h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" aria-hidden />
            <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
            {reviewCount > 0 && <span className="text-xs text-gray-400">({reviewCount})</span>}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-accent-600">{formatPrice(product.price)}</span>
            {product.original_price && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 relative z-10">
          <button type="button" onClick={handleWishlist} className={cn("w-9 h-9 rounded-lg border flex items-center justify-center", wished ? "text-accent-500 border-accent-200 bg-accent-50" : "text-gray-400 border-gray-200")} aria-label={t("wishlist")}>
            <Heart className={cn("w-4 h-4", wished && "fill-current")} />
          </button>
          <button type="button" onClick={handleAdd} disabled={isOutOfStock} className="btn btn-brand btn-sm">{t("add_to_cart")}</button>
        </div>
      </article>
    );
  }

  return (
    <article
      className="card-hover group relative flex flex-col overflow-hidden"
      onMouseEnter={() => setActionsOpen(true)}
      onMouseLeave={() => setActionsOpen(false)}
    >
      <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-label={alt} />

      <div className="absolute top-3 left-3 right-3 flex justify-between z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          {product.badge && (
            <Badge variant={badgeVariantFromProduct(product.badge)}>{product.badge}</Badge>
          )}
          {product.category && (
            <Badge variant="outline" className="text-[10px] capitalize">{product.category}</Badge>
          )}
        </div>
        {discount && <Badge className="bg-red-500 text-white ml-auto font-bold border-0">-{discount}%</Badge>}
      </div>

      <div className={cn(
        "absolute top-3 right-3 z-20 flex flex-col gap-1.5 transition-opacity",
        "opacity-100 lg:opacity-0",
        (actionsOpen || actionsOpen) && "lg:opacity-100"
      )}>
        <button type="button" onClick={handleWishlist} className={cn("w-8 h-8 rounded-lg glass flex items-center justify-center pointer-events-auto touch-manipulation", wished ? "text-accent-500" : "text-gray-500")} aria-label={t("wishlist")}>
          <Heart className={cn("w-4 h-4", wished && "fill-current")} />
        </button>
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addCompare(product); toast("info", lang === "bn" ? "তুলনায় যোগ" : "Added to compare"); }} disabled={isCompared(productId)} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-gray-500 pointer-events-auto touch-manipulation" aria-label={t("compare")}>
          <GitCompare className="w-4 h-4" />
        </button>
        <Link href={`/products/${product.slug}`} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-gray-500 pointer-events-auto touch-manipulation" aria-label={t("view_details")}>
          <Eye className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative aspect-[4/5] sm:aspect-square bg-gradient-to-br from-brand-50 via-blue-50 to-brand-100 overflow-hidden">
        {product.image_url ? (
          <Image src={product.image_url} alt={alt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-200">
            <Package className="w-14 h-14" aria-hidden />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
            <span className="bg-black/50 text-white text-xs font-bold px-3 py-1 rounded-full">{t("out_of_stock")}</span>
            <a
              href={`https://wa.me/8801825007977?text=${encodeURIComponent(lang === "bn" ? `${product.name_bn} — স্টক এলে জানান` : `Notify when ${product.name_en} is back`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] bg-green-600 text-white px-2 py-1 rounded-lg relative z-20"
            >
              {lang === "bn" ? "নোটিফাই" : "Notify me"}
            </a>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" aria-hidden />
          <span className="text-xs text-gray-500 font-medium">{rating.toFixed(1)}</span>
          {reviewCount > 0 && <span className="text-xs text-gray-400">({reviewCount})</span>}
          <span className="text-xs text-gray-300 ml-auto">
            {isOutOfStock ? t("out_of_stock") : t("in_stock")}
          </span>
        </div>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
          {lang === "bn" ? product.name_bn : product.name_en}
        </h3>
        <div className="flex items-baseline gap-2 mb-2 mt-auto">
          <span className="text-xl sm:text-2xl font-bold text-green-600">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {!isOutOfStock && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
              {lang === "bn" ? "COD ✓" : "COD ✓"}
            </span>
          )}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-100">bKash</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">Nagad</span>
          {reviewCount > 0 && (
            <span className="text-[10px] text-gray-400 ml-auto">{reviewCount} {lang === "bn" ? "রিভিউ" : "reviews"}</span>
          )}
        </div>
        <button type="button" onClick={handleAdd} disabled={isOutOfStock} className="btn btn-brand btn-sm w-full relative z-10 btn-ripple">
          <ShoppingCart className="w-4 h-4" aria-hidden />
          {t("add_to_cart")}
        </button>
      </div>
    </article>
  );
}
