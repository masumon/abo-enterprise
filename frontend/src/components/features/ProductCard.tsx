"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { formatPrice, discountPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface Props {
  product: Product;
  onAddToCart?: () => void;
}

export default function ProductCard({ product, onAddToCart }: Props) {
  const { addItem } = useCartStore();
  const { lang } = useLanguageStore();

  const handleAdd = () => {
    addItem({
      product_id: product.id ?? product.slug,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.image_url,
    });
    onAddToCart?.();
  };

  const discount = product.original_price
    ? discountPercent(product.original_price, product.price)
    : null;

  const isOutOfStock = product.stock_quantity === 0;

  return (
    <article className="card-hover group relative flex flex-col overflow-hidden">
      <Link href={`/products/${product.slug}`} className="absolute inset-0 z-0" aria-label={product.name_en} />

      {/* Badges */}
      <div className="absolute top-3 left-3 right-3 flex justify-between z-10 pointer-events-none">
        {product.badge && (
          <span className={cn(
            "badge text-xs",
            product.badge === "HOT" && "badge-hot",
            product.badge === "NEW" && "badge-new",
            product.badge === "SALE" && "badge-sale"
          )}>
            {product.badge}
          </span>
        )}
        {discount && (
          <span className="badge bg-red-500 text-white ml-auto font-bold">-{discount}%</span>
        )}
      </div>

      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-brand-50 via-blue-50 to-brand-100 overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name_en}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-108"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-200">
            <Package className="w-14 h-14" />
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
              {lang === "bn" ? "স্টক নেই" : "Out of Stock"}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-3 line-clamp-2 min-h-[2.5rem]">
          {lang === "bn" ? product.name_bn : product.name_en}
        </h3>

        <div className="flex items-baseline gap-2 mb-4 mt-auto">
          <span className="text-lg font-bold text-accent-600">{formatPrice(product.price)}</span>
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className="btn btn-brand btn-sm w-full relative z-10 group-hover:shadow-md transition-shadow"
        >
          <ShoppingCart className="w-4 h-4" />
          {isOutOfStock
            ? lang === "bn" ? "স্টক নেই" : "Out of Stock"
            : lang === "bn" ? "কার্টে যোগ করুন" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
