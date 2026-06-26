"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Star, Heart, Eye } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { formatPrice, discountPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface Props {
  product: Product;
  onAddToCart?: () => void;
  layout?: "grid" | "list";
}

export default function ProductCard({ product, onAddToCart, layout = "grid" }: Props) {
  const { addItem } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);

  const productId = product.id ?? product.slug;
  const wished = has(productId);
  const discount = product.original_price ? discountPercent(product.original_price, product.price) : null;
  const isOutOfStock = product.stock_quantity === 0;
  const rating = product.rating ?? 4.5;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: productId,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.image_url,
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
        <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-hidden />
        <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-brand-50 flex-shrink-0">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name_en} fill className="object-cover" sizes="112px" />
          ) : (
            <Package className="w-10 h-10 text-brand-200 m-auto mt-9" />
          )}
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          {product.category && (
            <span className="text-[10px] uppercase tracking-wider text-brand-500 font-semibold">{product.category}</span>
          )}
          <h3 className="font-semibold text-gray-800 line-clamp-2">{lang === "bn" ? product.name_bn : product.name_en}</h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-accent-600">{formatPrice(product.price)}</span>
            {product.original_price && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 relative z-10">
          <button onClick={handleWishlist} className={cn("w-9 h-9 rounded-lg border flex items-center justify-center", wished ? "text-accent-500 border-accent-200 bg-accent-50" : "text-gray-400 border-gray-200")} aria-label={t("wishlist")}>
            <Heart className={cn("w-4 h-4", wished && "fill-current")} />
          </button>
          <button onClick={handleAdd} disabled={isOutOfStock} className="btn btn-brand btn-sm">{t("add_to_cart")}</button>
        </div>
      </article>
    );
  }

  return (
    <article className="card-hover group relative flex flex-col overflow-hidden">
      <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-label={product.name_en} />

      <div className="absolute top-3 left-3 right-3 flex justify-between z-10 pointer-events-none">
        <div className="flex flex-col gap-1">
          {product.badge && (
            <span className={cn("badge text-xs", product.badge === "HOT" && "badge-hot", product.badge === "NEW" && "badge-new", product.badge === "SALE" && "badge-sale")}>
              {product.badge}
            </span>
          )}
          {product.category && (
            <span className="badge bg-white/90 text-gray-600 text-[10px] capitalize">{product.category}</span>
          )}
        </div>
        {discount && <span className="badge bg-red-500 text-white ml-auto font-bold">-{discount}%</span>}
      </div>

      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={handleWishlist} className={cn("w-8 h-8 rounded-lg glass flex items-center justify-center pointer-events-auto", wished ? "text-accent-500" : "text-gray-500")} aria-label={t("wishlist")}>
          <Heart className={cn("w-4 h-4", wished && "fill-current")} />
        </button>
        <Link href={`/products/${product.slug}`} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-gray-500 pointer-events-auto" aria-label={t("view_details")}>
          <Eye className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative h-48 bg-gradient-to-br from-brand-50 via-blue-50 to-brand-100 overflow-hidden">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name_en} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-200">
            <Package className="w-14 h-14" />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">{t("out_of_stock")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-500 font-medium">{rating.toFixed(1)}</span>
          <span className="text-xs text-gray-300 ml-auto">
            {isOutOfStock ? t("out_of_stock") : t("in_stock")}
          </span>
        </div>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
          {lang === "bn" ? product.name_bn : product.name_en}
        </h3>
        <div className="flex items-baseline gap-2 mb-3 mt-auto">
          <span className="text-lg font-bold text-accent-600">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>
        <button onClick={handleAdd} disabled={isOutOfStock} className="btn btn-brand btn-sm w-full relative z-10 btn-ripple">
          <ShoppingCart className="w-4 h-4" />
          {t("add_to_cart")}
        </button>
      </div>
    </article>
  );
}
