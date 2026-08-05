"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Package, Star, Heart, Eye, GitCompare, Zap } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { formatPrice, discountPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { resolveProductImage } from "@/lib/demoImages";
import Badge, { badgeVariantFromProduct } from "@/components/ui/Badge";
import CountdownTimer, { getWeeklySaleEnd } from "@/components/ui/CountdownTimer";
import { PaymentMethodBadges } from "@/components/ui/PaymentMethodBadge";
import type { Product } from "@/types";

interface Props {
  product: Product;
  onAddToCart?: () => void;
  layout?: "grid" | "list";
  /** "compact" is used by the homepage's Flash Sale / Featured Products
   *  grids for a denser mobile layout. Every other grid (/products,
   *  /search, wishlist, compare) keeps the default sizing unchanged. */
  density?: "default" | "compact";
}

function productAlt(product: Product, lang: string) {
  return lang === "bn"
    ? `${product.name_bn} — ABO Enterprise`
    : `${product.name_en} — ABO Enterprise`;
}

export default function ProductCard({ product, onAddToCart, layout = "grid", density = "default" }: Props) {
  const compact = density === "compact";
  const router = useRouter();
  const { addItem } = useCartStore();
  const { toggle, has } = useWishlistStore();
  const { add: addCompare, has: isCompared } = useCompareStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);
  const [actionsOpen, setActionsOpen] = useState(false);

  const productId = product.id ?? product.slug;
  const wished = has(productId);
  // A live flash sale overrides the regular price everywhere on the card: the
  // discount is measured against the normal price, not the original_price, so
  // the badge reflects what the customer actually saves right now.
  const flashLive =
    product.is_flash_sale === true &&
    product.flash_sale_price != null &&
    product.flash_sale_price < product.price &&
    (!product.flash_sale_ends_at || new Date(product.flash_sale_ends_at) > new Date());
  const effectivePrice = flashLive ? product.flash_sale_price! : product.price;
  const strikePrice = flashLive ? product.price : product.original_price;
  const discount = strikePrice ? discountPercent(strikePrice, effectivePrice) : null;
  const isOutOfStock = product.stock_quantity === 0;
  const rating = product.rating ?? 0;
  const reviewCount = product.review_count ?? 0;
  const alt = productAlt(product, lang);
  const imageSrc = resolveProductImage(product.image_url, product.slug);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      product_id: productId,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: effectivePrice,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      delivery_charge: product.delivery_charge ?? null,
      requires_advance: product.requires_advance ?? false,
    });
    onAddToCart?.();
    toast("success", lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
  };

  // Same add-then-redirect pattern as the Product Details page's Buy Now.
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      product_id: productId,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: effectivePrice,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      delivery_charge: product.delivery_charge ?? null,
      requires_advance: product.requires_advance ?? false,
    });
    router.push("/checkout");
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
        <div className="relative w-28 aspect-square rounded-xl overflow-hidden bg-brand-50 flex-shrink-0 pointer-events-none">
          <Image src={imageSrc} alt={alt} fill className="object-cover" sizes="112px" />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          {product.category && (
            <Badge variant="outline" className="text-xs capitalize mb-1">{product.category}</Badge>
          )}
          <h3 className="font-semibold text-heading line-clamp-2">{lang === "bn" ? product.name_bn : product.name_en}</h3>
          {reviewCount > 0 ? (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" aria-hidden />
              <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviewCount})</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 mt-1">{lang === "bn" ? "এখনো রিভিউ নেই" : "No reviews yet"}</span>
          )}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-accent-600">
              {formatPrice(effectivePrice)}
            </span>
            {strikePrice && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(strikePrice)}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 relative z-10">
          <button type="button" onClick={handleWishlist} className={cn("w-9 h-9 rounded-lg border flex items-center justify-center", wished ? "text-accent-500 border-accent-200 bg-accent-50" : "text-gray-400 border-gray-200")} aria-label={t("wishlist")}>
            <Heart className={cn("w-4 h-4", wished && "fill-current")} />
          </button>
          <button type="button" onClick={handleAdd} disabled={isOutOfStock} className="btn btn-primary btn-sm">{t("add_to_cart")}</button>
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

      <div className={cn("absolute left-3 right-3 flex justify-between z-10 pointer-events-none", compact ? "top-2" : "top-3")}>
        <div className="flex flex-col gap-1">
          {product.badge && (
            <Badge variant={badgeVariantFromProduct(product.badge)}>{product.badge}</Badge>
          )}
          {product.category && !compact && (
            <Badge variant="outline" className="text-xs capitalize">{product.category}</Badge>
          )}
        </div>
        {discount && (
          <Badge className="ml-auto font-bold border-0 text-white bg-accent-600">
            {flashLive ? "⚡ " : ""}-{discount}%
          </Badge>
        )}
      </div>

      <div className={cn(
        "absolute z-20 flex flex-col transition-opacity",
        compact ? "top-2 right-2 gap-1" : "top-3 right-3 gap-1.5",
        // Always visible on touch (mobile/tablet); reveal on hover for desktop.
        "opacity-100 lg:opacity-0",
        actionsOpen && "lg:opacity-100"
      )}>
        <button type="button" onClick={handleWishlist} className={cn("rounded-lg glass flex items-center justify-center pointer-events-auto touch-manipulation", compact ? "w-8 h-8" : "w-9 h-9", wished ? "text-accent-500" : "text-gray-500")} aria-label={t("wishlist")}>
          <Heart className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4", wished && "fill-current")} />
        </button>
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); addCompare(product); toast("info", lang === "bn" ? "তুলনায় যোগ" : "Added to compare"); }} disabled={isCompared(productId)} className={cn("rounded-lg glass flex items-center justify-center text-gray-500 pointer-events-auto touch-manipulation", compact ? "w-8 h-8" : "w-9 h-9")} aria-label={t("compare")}>
          <GitCompare className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </button>
        <Link href={`/products/${product.slug}`} className={cn("rounded-lg glass flex items-center justify-center text-gray-500 pointer-events-auto touch-manipulation", compact ? "w-8 h-8" : "w-9 h-9")} aria-label={t("view_details")}>
          <Eye className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </Link>
      </div>

      <div className={cn(
        "relative bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-900/40 overflow-hidden pointer-events-none",
        compact ? "aspect-square" : "aspect-[4/5] sm:aspect-square"
      )}>
        <Image src={imageSrc} alt={alt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
            <span className="bg-black/50 text-white text-xs font-bold px-3 py-1 rounded-full">{t("out_of_stock")}</span>
            <a
              href={`https://wa.me/8801825007977?text=${encodeURIComponent(lang === "bn" ? `${product.name_bn} — স্টক এলে জানান` : `Notify when ${product.name_en} is back`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] bg-green-600 text-white px-2 py-1 rounded-lg relative z-20 pointer-events-auto"
            >
              {lang === "bn" ? "নোটিফাই" : "Notify me"}
            </a>
          </div>
        )}
      </div>

      <div className={cn("flex flex-col flex-1", compact ? "p-2.5" : "p-4")}>
        <div className={cn("flex items-center gap-1", compact ? "mb-1" : "mb-1.5")}>
          {reviewCount > 0 ? (
            <>
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" aria-hidden />
              <span className="text-xs text-gray-500 font-medium">{rating.toFixed(1)}</span>
              {!compact && <span className="text-xs text-gray-400">({reviewCount})</span>}
            </>
          ) : (
            !compact && <span className="text-xs text-gray-400">{lang === "bn" ? "এখনো রিভিউ নেই" : "No reviews yet"}</span>
          )}
          {!compact && (
            <span className="text-xs text-gray-300 ml-auto">
              {isOutOfStock ? t("out_of_stock") : t("in_stock")}
            </span>
          )}
        </div>
        <h3 className={cn(
          "font-semibold text-heading leading-snug line-clamp-2",
          compact ? "text-xs mb-1.5 min-h-[2rem]" : "text-sm mb-2 min-h-[2.5rem]"
        )}>
          {lang === "bn" ? product.name_bn : product.name_en}
        </h3>
        <div className={cn("flex items-baseline gap-2 mt-auto", compact ? "mb-1.5" : "mb-2")}>
          <span className={cn("font-bold text-accent-600", compact ? "text-base" : "text-xl sm:text-2xl")}>{formatPrice(effectivePrice)}</span>
          {strikePrice && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(strikePrice)}</span>
          )}
        </div>
        {flashLive && !compact && (
          <CountdownTimer endDate={getWeeklySaleEnd()} label={lang === "bn" ? "ফ্ল্যাশ সেল শেষ" : "Flash sale ends"} className="mb-2 text-xs" />
        )}
        {!compact && (
          <div className="flex flex-wrap gap-1 mb-3 items-center">
            <PaymentMethodBadges />
            {reviewCount > 0 && (
              <span className="text-xs text-gray-400 ml-auto">{reviewCount} {lang === "bn" ? "রিভিউ" : "reviews"}</span>
            )}
          </div>
        )}
        <div className="flex gap-1.5 relative z-10">
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            aria-label={t("add_to_cart")}
            className="btn btn-outline btn-sm flex-shrink-0"
          >
            <ShoppingCart className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className={cn("btn btn-primary flex-1 btn-ripple", compact ? "btn-sm text-xs gap-1" : "btn-sm")}
          >
            <Zap className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} aria-hidden />
            {t("buy_now")}
          </button>
        </div>
      </div>
    </article>
  );
}
