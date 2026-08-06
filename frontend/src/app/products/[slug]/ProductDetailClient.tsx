"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  ShoppingCart, ChevronLeft, Package, CheckCircle,
  Heart, GitCompare, Share2, MessageCircle, Zap, Star, Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productsApi, reviewsApi } from "@/lib/api";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { formatPrice, discountPercent, cn, WHATSAPP_NUMBER } from "@/lib/utils";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import ImageZoom from "@/components/ui/ImageZoom";
import ProductCard from "@/components/features/ProductCard";
import ProductFAQ from "@/components/features/ProductFAQ";
import ProductReviews from "@/components/features/ProductReviews";
import GlassCard from "@/components/ui/GlassCard";
import CountdownTimer, { getWeeklySaleEnd } from "@/components/ui/CountdownTimer";

const ProductBookingModal = dynamic(() => import("@/components/products/ProductBookingModal"), { ssr: false });

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const [related, setRelated] = useState<Product[]>([]);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewCount, setReviewCount] = useState(product.review_count ?? 0);
  /*
   * Screen 07 — the rating opened at a hardcoded 4.5 whenever the product had
   * none, and the star row rendered whether or not a review stood behind it.
   * The structured data was corrected under GAP-01; the page itself was still
   * making the claim. A rating is measured or absent, never assumed.
   */
  const [avgRating, setAvgRating] = useState(product.rating ?? 0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  // Single source: the API-computed capabilities array, with a flag fallback.
  const canBook = product.capabilities?.includes("bookable") ?? !!product.is_bookable;
  const buySectionRef = useRef<HTMLDivElement>(null);
  const { addItem, openCart } = useCartStore();
  const { toggle: toggleWish, has: wished } = useWishlistStore();
  const { add: addCompare, has: compared } = useCompareStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);

  useEffect(() => {
    productsApi.related(product.slug).then((r) => setRelated(r.data.data ?? [])).catch(() => {});
    reviewsApi.list({ product_id: product.id, per_page: 50 } as Parameters<typeof reviewsApi.list>[0])
      .then((r) => {
        const reviews = r.data.data ?? [];
        if (reviews.length > 0) {
          setReviewCount(reviews.length);
          setAvgRating(reviews.reduce((s, rv) => s + rv.rating, 0) / reviews.length);
        }
      })
      .catch(() => {});
  }, [product.slug, product.id]);

  useEffect(() => {
    const el = buySectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleAdd = () => {
    addItem({
      product_id: product.id ?? product.slug,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: effectivePrice,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      delivery_charge: product.delivery_charge ?? null,
      requires_advance: product.requires_advance ?? false,
    });
    setAdded(true);
    toast("success", lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAdd();
    router.push("/checkout");
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: product.name_en, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast("success", lang === "bn" ? "লিংক কপি হয়েছে" : "Link copied");
    }
  };

  const images = [product.image_url, ...(product.images ?? [])].filter(Boolean) as string[];
  // Same live-flash-sale check as ProductCard.tsx: the discount/savings/price
  // shown here must always agree with what the flash-sale badge promises.
  const flashLive =
    product.is_flash_sale === true &&
    product.flash_sale_price != null &&
    product.flash_sale_price < product.price &&
    (!product.flash_sale_ends_at || new Date(product.flash_sale_ends_at) > new Date());
  const effectivePrice = flashLive ? product.flash_sale_price! : product.price;
  const strikePrice = flashLive ? product.price : product.original_price;
  const discount = strikePrice ? discountPercent(strikePrice, effectivePrice) : null;
  const name = lang === "bn" ? product.name_bn : product.name_en;
  const desc = lang === "bn" ? product.description_bn : product.description_en;
  const productId = product.id ?? product.slug;
  const waMsg = encodeURIComponent(`${lang === "bn" ? "অর্ডার করতে চাই" : "I want to order"}: ${name} - ${formatPrice(effectivePrice)}`);
  const savings = strikePrice ? strikePrice - effectivePrice : 0;

  /*
   * The delivery line, built from the settings checkout bills from. A
   * per-product override wins where the admin set one; free delivery is only
   * claimed when this product's price alone already clears the threshold, so
   * the promise holds for a single-item order — the case the line describes.
   */
  const { settings } = usePublicSettings();
  const sylhetCharge = product.delivery_charge ?? Number(getSettingValue(settings, "delivery_charge_sylhet") || NaN);
  const freeMin = Number(getSettingValue(settings, "free_delivery_min_amount") || NaN);
  const deliveryLine = (() => {
    if (!Number.isFinite(sylhetCharge)) return null;
    const free = Number.isFinite(freeMin) && product.price >= freeMin && product.delivery_charge == null;
    const cost = free
      ? (lang === "bn" ? "ফ্রি" : "Free")
      : formatPrice(sylhetCharge);
    const parts = [cost, lang === "bn" ? "১–২ দিন" : "1–2 days", lang === "bn" ? "ক্যাশ অন ডেলিভারি" : "cash on delivery"];
    return parts.join(" · ");
  })();

  return (
    <main className="min-h-screen py-8 px-4 pb-[calc(var(--mobile-chrome-bottom)+5rem)] lg:pb-8">
      <div className="max-w-6xl mx-auto">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
          <ChevronLeft className="w-4 h-4" aria-hidden />
          {lang === "bn" ? "পণ্যে ফিরে যান" : "Back to Products"}
        </button>

        <GlassCard className="overflow-hidden mb-10">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10">
              <div className="relative aspect-[4/5] sm:aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 mb-4">
                {images[selectedImage] ? (
                  <ImageZoom src={images[selectedImage]} alt={`${name} — ABO Enterprise`} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                    <span className="text-6xl font-bold tracking-tight" aria-hidden>
                      {(name || "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="px-3 text-xs font-medium opacity-80 text-center line-clamp-2">
                      {name}
                    </span>
                  </div>
                )}
                {discount && <span className="absolute top-3 right-3 badge bg-accent-600 text-white z-10">-{discount}%</span>}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} type="button" onClick={() => setSelectedImage(i)} className={cn("w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0", selectedImage === i ? "border-brand-500" : "border-gray-200")} aria-label={`Image ${i + 1}`}>
                      <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                {reviewCount > 0 ? (
                  <>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" aria-hidden />
                      <span className="font-semibold text-sm">{avgRating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({reviewCount} {lang === "bn" ? "রিভিউ" : "reviews"})
                    </span>
                  </>
                ) : (
                  /* Neutral grey, never amber or red — a new product having no
                     reviews yet is ordinary, not a warning. */
                  <>
                    <span className="badge badge-default">
                      {lang === "bn" ? "এখনো রিভিউ নেই" : "No reviews yet"}
                    </span>
                    <a href="#reviews" className="text-xs font-semibold text-brand-600 hover:underline">
                      {lang === "bn" ? "প্রথম রিভিউ দিন" : "Be the first to review"}
                    </a>
                  </>
                )}
              </div>

              {product.is_flash_sale && (
                <CountdownTimer endDate={getWeeklySaleEnd()} label={lang === "bn" ? "ফ্ল্যাশ সেল শেষ" : "Flash sale ends"} className="mb-3" />
              )}

              {product.category && <span className="text-xs uppercase tracking-wider text-brand-500 font-semibold mb-1">{product.category}</span>}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">{name}</h1>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-3xl font-bold text-accent-600">{formatPrice(effectivePrice)}</span>
                {strikePrice && <span className="text-lg text-gray-400 line-through">{formatPrice(strikePrice)}</span>}
              </div>
              {savings > 0 && (
                /* Screen 07 — the saving beside the price, not a sentence under
                   it: the number is the argument, and a pill puts it where the
                   eye already is. */
                <span className="inline-flex items-center self-start px-2.5 py-1 mb-4 rounded-full text-xs font-bold bg-accent-50 text-accent-800 dark:bg-accent-500/20 dark:text-accent-300">
                  {lang === "bn" ? `সাশ্রয় ${formatPrice(savings)}` : `Save ${formatPrice(savings)}`}
                </span>
              )}
              <div className="mb-4">
                {(product.stock_quantity ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" aria-hidden />
                    {t("in_stock")} ({product.stock_quantity})
                  </span>
                ) : (
                  <span className="text-red-500 text-sm font-medium">{t("out_of_stock")}</span>
                )}
              </div>
              {/*
                Screen 07 — in Bangladesh the delivery cost and the wait are the
                decision variables right after the price, and both used to live
                two screens away in the cart. The numbers come from the same
                settings checkout bills from (delivery_charge_sylhet,
                free_delivery_min_amount), never from a figure typed here, so
                the page cannot promise something the invoice contradicts.
                A per-product override wins when the admin has set one.
              */}
              {deliveryLine && (
                <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                  <Truck className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-heading">
                      {lang === "bn" ? "সিলেট সদরে ডেলিভারি" : "Delivery to Sylhet Sadar"}
                    </p>
                    <p className="text-xs text-muted">{deliveryLine}</p>
                  </div>
                  <Link href="/shipping" className="text-xs font-semibold text-brand-600 hover:underline flex-shrink-0">
                    {lang === "bn" ? "বিস্তারিত" : "details"}
                  </Link>
                </div>
              )}

              {/* Screen 07 — the page's own sections, so a buyer who wants the
                  specs or the reviews is not asked to scroll the whole page to
                  find out whether they exist. Anchors only; each entry is
                  dropped when its section is not rendered. */}
              <nav
                aria-label={lang === "bn" ? "পাতার অংশ" : "Page sections"}
                className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-5"
              >
                {[
                  { id: "overview", en: "Overview", bn: "সংক্ষেপে", show: Boolean(desc) },
                  { id: "specs", en: "Specs", bn: "স্পেসিফিকেশন", show: Boolean(product.specifications && Object.keys(product.specifications).length > 0) },
                  { id: "reviews", en: "Reviews", bn: "রিভিউ", show: true },
                ].filter((x) => x.show).map((x) => (
                  <a
                    key={x.id}
                    href={`#${x.id}`}
                    className="flex-shrink-0 min-h-[36px] flex items-center px-3.5 rounded-full text-sm font-semibold whitespace-nowrap border border-gray-200 dark:border-white/10 text-muted hover:text-brand-600"
                  >
                    {lang === "bn" ? x.bn : x.en}
                  </a>
                ))}
              </nav>

              {desc && (
                <div id="overview" className="scroll-mt-24">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">{desc}</p>
                </div>
              )}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div id="specs" className="mb-6 scroll-mt-24">
                  <h3 className="font-semibold mb-3 text-sm">{lang === "bn" ? "স্পেসিফিকেশন" : "Specifications"}</h3>
                  <div className="space-y-2">
                    {Object.entries(product.specifications).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm py-1.5 border-b border-gray-50 dark:border-white/5">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium">{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => toggleWish({ product_id: productId, slug: product.slug, name_en: product.name_en, name_bn: product.name_bn, price: product.price, image_url: product.image_url })} className={cn("btn btn-outline btn-sm", wished(productId) && "text-accent-500 border-accent-300")}>
                  <Heart className={cn("w-4 h-4", wished(productId) && "fill-current")} />
                </button>
                <button type="button" onClick={() => { addCompare(product); toast("info", lang === "bn" ? "তুলনায় যোগ হয়েছে" : "Added to compare"); }} disabled={compared(productId)} className="btn btn-outline btn-sm">
                  <GitCompare className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleShare} className="btn btn-outline btn-sm"><Share2 className="w-4 h-4" /></button>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm text-green-600">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
              <div ref={buySectionRef} className="mt-auto flex flex-col gap-3">
                <button type="button" onClick={handleAdd} disabled={product.stock_quantity === 0} className={cn("btn btn-md w-full btn-ripple", added ? "btn-outline" : "btn-brand")}>
                  <ShoppingCart className="w-5 h-5" aria-hidden />
                  {added ? (lang === "bn" ? "যোগ হয়েছে!" : "Added!") : t("add_to_cart")}
                </button>
                <button type="button" onClick={handleBuyNow} disabled={product.stock_quantity === 0} className="btn btn-primary btn-md w-full btn-ripple">
                  <Zap className="w-5 h-5" aria-hidden />
                  {t("buy_now")}
                </button>
                {/* Cross-capability: a product an admin marked "Also bookable"
                    opens a real booking request tracked in Admin → Bookings
                    (reuses the v1 bookings API — no cart/checkout/payment). */}
                {canBook && (
                  <button
                    type="button"
                    onClick={() => setBookingOpen(true)}
                    className="btn btn-outline btn-md w-full gap-2"
                  >
                    {lang === "bn" ? "সেবা / ইনস্টলেশন বুক করুন" : "Book a service / installation"}
                  </button>
                )}
                <p className="text-center text-xs text-gray-400">{lang === "bn" ? "অ্যাকাউন্ট ছাড়াই অর্ডার — গেস্ট চেকআউট" : "No account needed — guest checkout"}</p>
                <p className="text-center text-xs text-muted mt-2">
                  <Link href="/legal/refund" className="text-brand-600 hover:underline">
                    {lang === "bn" ? "↩ রিটার্ন ও রিফান্ড নীতি" : "↩ Return & refund policy"}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Anchor for "Be the first to review" above. */}
        <div id="reviews" className="scroll-mt-24">
          <ProductReviews productId={product.id} />
        </div>
        <ProductFAQ />
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-4">{lang === "bn" ? "সম্পর্কিত পণ্য" : "Related Products"}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p.id ?? p.slug} product={p} onAddToCart={openCart} />)}
            </div>
          </section>
        )}
      </div>

      {showStickyBar && (product.stock_quantity ?? 0) > 0 && (
        <div className="fixed bottom-mobile-nav left-0 right-0 z-40 surface-card backdrop-blur-md border-t px-4 py-3 flex items-center gap-3 shadow-lg lg:hidden">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-accent-600">{formatPrice(effectivePrice)}</p>
            <p className="text-xs text-muted truncate">{name}</p>
          </div>
          <button type="button" onClick={handleAdd} className="btn btn-outline btn-sm flex-shrink-0">{t("add_to_cart")}</button>
          <button type="button" onClick={handleBuyNow} className="btn btn-primary btn-sm flex-shrink-0">{t("buy_now")}</button>
        </div>
      )}

      {canBook && (
        <ProductBookingModal product={product} open={bookingOpen} onClose={() => setBookingOpen(false)} />
      )}
    </main>
  );
}
