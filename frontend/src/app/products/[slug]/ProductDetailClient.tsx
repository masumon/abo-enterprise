"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  ShoppingCart, ChevronLeft, ChevronRight, CheckCircle,
  Heart, GitCompare, Share2, MessageCircle, Zap, Star, Truck,
  Phone, ShieldCheck, Wallet, Home,
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
import { formatPrice, discountPercent, cn } from "@/lib/utils";
import { useContactInfo } from "@/hooks/useContactInfo";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import ImageZoom from "@/components/ui/ImageZoom";
import ProductCard from "@/components/features/ProductCard";
import ProductFAQ from "@/components/features/ProductFAQ";
import ProductReviews from "@/components/features/ProductReviews";
import GlassCard from "@/components/ui/GlassCard";
import CountdownTimer, { getWeeklySaleEnd } from "@/components/ui/CountdownTimer";
import { parseDhakaDateTime } from "@/lib/flashSale";
import { parseDescription, specRows } from "@/lib/productText";

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
  const touchX = useRef<number | null>(null);
  const { addItem, openCart } = useCartStore();
  const { toggle: toggleWish, has: wished } = useWishlistStore();
  const { add: addCompare, has: compared } = useCompareStore();
  const { lang } = useLanguageStore();
  const contact = useContactInfo();
  const t = useT();
  const toast = useToastStore((s) => s.push);

  useEffect(() => {
    productsApi.related(product.slug)
      .then((r) => {
        const items = r.data.data ?? [];
        if (items.length > 0) {
          setRelated(items);
          return;
        }
        // No other active product shares this category — show something
        // instead of a silently empty "Related Products" section.
        productsApi.list({ featured: true, per_page: 5 })
          .then((fr) => setRelated((fr.data.data ?? []).filter((p) => p.id !== product.id).slice(0, 4)))
          .catch(() => {});
      })
      .catch(() => {});
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
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("success", lang === "bn" ? "লিংক কপি হয়েছে" : "Link copied");
      }
    } catch {
      /* share sheet dismissed — nothing to do */
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
  const descBlocks = parseDescription(desc);
  const specs = specRows(product.specifications);
  const categoryHref = product.category ? `/products?category=${encodeURIComponent(product.category)}` : "/products";
  const categoryLabel = product.category ? product.category.replace(/[-_]+/g, " ") : "";
  const imgCount = images.length;
  const showImage = (i: number) => setSelectedImage(((i % imgCount) + imgCount) % imgCount);
  // Swipe left/right on the main photo (phones/tablets).
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || imgCount < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 40) showImage(selectedImage + (dx < 0 ? 1 : -1));
  };

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
        <nav aria-label={lang === "bn" ? "অবস্থান" : "Breadcrumb"} className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0">
            <li>
              <Link href="/" className="inline-flex items-center gap-1 hover:text-brand-600">
                <Home className="w-3.5 h-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only">{lang === "bn" ? "হোম" : "Home"}</span>
              </Link>
            </li>
            <li aria-hidden><ChevronRight className="w-3.5 h-3.5" /></li>
            <li><Link href="/products" className="hover:text-brand-600">{lang === "bn" ? "পণ্য" : "Products"}</Link></li>
            {product.category && (
              <>
                <li aria-hidden><ChevronRight className="w-3.5 h-3.5" /></li>
                <li><Link href={categoryHref} className="capitalize hover:text-brand-600">{categoryLabel}</Link></li>
              </>
            )}
            <li aria-hidden className="hidden sm:block"><ChevronRight className="w-3.5 h-3.5" /></li>
            <li aria-current="page" className="hidden sm:block min-w-0 max-w-[16rem] truncate text-gray-700 dark:text-gray-200">{name}</li>
          </ol>
        </nav>

        <GlassCard className="overflow-hidden mb-10">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10">
              <div
                className={cn("relative aspect-square rounded-xl overflow-hidden mb-4", images[selectedImage] ? "bg-[#fff] ring-1 ring-gray-100 dark:ring-white/10" : "bg-gradient-to-br from-brand-50 to-brand-100")}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {images[selectedImage] ? (
                  <ImageZoom src={images[selectedImage]} alt={`${name} — ABO Enterprise`} fit="contain" label={lang === "bn" ? "ছবি বড় করে দেখুন" : "Zoom image"} />
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
                {product.badge && <span className="absolute top-3 left-3 badge bg-brand-600 text-white z-10 max-w-[60%] truncate">{product.badge}</span>}
                {imgCount > 1 && (
                  <>
                    <button type="button" onClick={() => showImage(selectedImage - 1)} aria-label={lang === "bn" ? "আগের ছবি" : "Previous image"} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-900/80 shadow flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-brand-600">
                      <ChevronLeft className="w-5 h-5" aria-hidden />
                    </button>
                    <button type="button" onClick={() => showImage(selectedImage + 1)} aria-label={lang === "bn" ? "পরের ছবি" : "Next image"} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-900/80 shadow flex items-center justify-center text-gray-700 dark:text-gray-200 hover:text-brand-600">
                      <ChevronRight className="w-5 h-5" aria-hidden />
                    </button>
                    <span className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
                      {selectedImage + 1}/{imgCount}
                    </span>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button key={i} type="button" onClick={() => setSelectedImage(i)} className={cn("w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 bg-[#fff]", selectedImage === i ? "border-brand-500" : "border-gray-200 dark:border-white/10")} aria-label={`Image ${i + 1}`} aria-current={selectedImage === i}>
                      <Image src={img} alt="" width={64} height={64} className="object-contain w-full h-full p-1" />
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

              {flashLive && (
                <CountdownTimer endDate={parseDhakaDateTime(product.flash_sale_ends_at) ?? getWeeklySaleEnd()} label={lang === "bn" ? "ফ্ল্যাশ সেল শেষ" : "Flash sale ends"} className="mb-3" />
              )}

              {product.category && (
                <Link href={categoryHref} className="self-start text-xs uppercase tracking-wider text-brand-500 font-semibold mb-1 hover:underline">{categoryLabel}</Link>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-snug text-gray-900 dark:text-white mb-2 break-words [overflow-wrap:anywhere]">{name}</h1>
              {(product.brand || product.sku) && (
                <p className="text-xs text-muted mb-3">
                  {product.brand && <>{lang === "bn" ? "ব্র্যান্ড" : "Brand"}: <span className="font-semibold text-heading">{product.brand}</span></>}
                  {product.brand && product.sku && " · "}
                  {product.sku && <>SKU: {product.sku}</>}
                </p>
              )}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
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

              <div className="grid grid-cols-2 gap-2 mb-5 text-xs">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-white/5">
                  <Wallet className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold text-heading">{lang === "bn" ? "পেমেন্ট" : "Payment"}</p>
                    <p className="text-muted">{lang === "bn" ? "ক্যাশ অন ডেলিভারি, বিকাশ, নগদ" : "Cash on delivery, bKash, Nagad"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-white/5">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-brand-600 flex-shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold text-heading">{lang === "bn" ? "ওয়ারেন্টি" : "Warranty"}</p>
                    <p className="text-muted break-words">{product.warranty_info?.trim() || (lang === "bn" ? "ডেলিভারির সময় চেক করে নিন — রিটার্ন নীতি প্রযোজ্য" : "Check on delivery — return policy applies")}</p>
                  </div>
                </div>
                {product.delivery_info?.trim() && (
                  <p className="col-span-2 text-muted px-1 break-words">🚚 {product.delivery_info}</p>
                )}
              </div>

              {/* Screen 07 — the page's own sections, so a buyer who wants the
                  specs or the reviews is not asked to scroll the whole page to
                  find out whether they exist. Anchors only; each entry is
                  dropped when its section is not rendered. */}
              <nav
                aria-label={lang === "bn" ? "পাতার অংশ" : "Page sections"}
                className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-5"
              >
                {[
                  { id: "overview", en: "Overview", bn: "সংক্ষেপে", show: descBlocks.length > 0 },
                  { id: "specs", en: "Specs", bn: "স্পেসিফিকেশন", show: specs.length > 0 },
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

              {descBlocks.length > 0 && (
                <div id="overview" className="scroll-mt-24 mb-6 space-y-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300 break-words">
                  <h2 className="font-semibold text-sm text-heading">{lang === "bn" ? "পণ্যের বিবরণ" : "Description"}</h2>
                  {descBlocks.map((b, i) =>
                    b.type === "p" ? (
                      <p key={i}>{b.text}</p>
                    ) : (
                      <ul key={i} className="space-y-1.5">
                        {b.items.map((it, j) => (
                          <li key={j} className="flex gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-500" aria-hidden />
                            <span className="min-w-0">{it}</span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </div>
              )}
              {specs.length > 0 && (
                <div id="specs" className="mb-6 scroll-mt-24">
                  <h2 className="font-semibold mb-3 text-sm text-heading">{lang === "bn" ? "স্পেসিফিকেশন" : "Specifications"}</h2>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
                    <table className="w-full text-sm table-fixed">
                      <tbody>
                        {specs.map(([k, v]) => (
                          <tr key={k} className="odd:bg-gray-50 dark:odd:bg-white/5">
                            <th scope="row" className="w-2/5 px-3 py-2 text-left align-top font-medium text-gray-500 dark:text-gray-400 break-words">{k}</th>
                            <td className="px-3 py-2 align-top font-medium text-heading break-words [overflow-wrap:anywhere]">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                <button type="button" onClick={handleShare} className="btn btn-outline btn-sm gap-1.5" aria-label={lang === "bn" ? "শেয়ার করুন" : "Share"}>
                  <Share2 className="w-4 h-4" aria-hidden />
                  <span className="text-xs">{lang === "bn" ? "শেয়ার" : "Share"}</span>
                </button>
              </div>
              <div className={cn("grid gap-2 mb-4", contact.hasPhone ? "grid-cols-2" : "grid-cols-1")}>
                <a href={`${contact.waBase}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0">
                  <MessageCircle className="w-4 h-4" aria-hidden />
                  {lang === "bn" ? "WhatsApp-এ অর্ডার" : "Order on WhatsApp"}
                </a>
                {contact.hasPhone && (
                  <a href={contact.telHref} className="btn btn-outline btn-sm gap-1.5">
                    <Phone className="w-4 h-4" aria-hidden />
                    {lang === "bn" ? "কল করুন" : "Call us"}
                  </a>
                )}
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
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold">{lang === "bn" ? "একই ধরনের আরও পণ্য" : "Related Products"}</h2>
              <Link href={categoryHref} className="text-sm font-semibold text-brand-600 hover:underline flex-shrink-0">{lang === "bn" ? "সব দেখুন" : "View all"}</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
