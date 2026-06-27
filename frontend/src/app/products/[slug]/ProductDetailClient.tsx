"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ShoppingCart, ChevronLeft, Package, CheckCircle,
  Heart, GitCompare, Share2, MessageCircle, Zap,
} from "lucide-react";
import { productsApi } from "@/lib/api";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import { useToastStore } from "@/store/toast";
import { formatPrice, discountPercent, cn, WHATSAPP_NUMBER } from "@/lib/utils";
import ImageZoom from "@/components/ui/ImageZoom";
import ProductCard from "@/components/features/ProductCard";
import ProductFAQ from "@/components/features/ProductFAQ";
import ProductReviews from "@/components/features/ProductReviews";
import CheckoutModal from "@/components/features/CheckoutModal";
import GlassCard from "@/components/ui/GlassCard";
import { useRouter } from "next/navigation";

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const [related, setRelated] = useState<Product[]>([]);
  const [added, setAdded] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem, openCart } = useCartStore();
  const { toggle: toggleWish, has: wished } = useWishlistStore();
  const { add: addCompare, has: compared } = useCompareStore();
  const { lang } = useLanguageStore();
  const t = useT();
  const toast = useToastStore((s) => s.push);

  useEffect(() => {
    productsApi.related(product.slug).then((r) => setRelated(r.data.data ?? [])).catch(() => {});
  }, [product.slug]);

  const handleAdd = () => {
    addItem({
      product_id: product.id ?? product.slug,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.image_url,
    });
    setAdded(true);
    toast("success", lang === "bn" ? "কার্টে যোগ হয়েছে" : "Added to cart");
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAdd();
    setCheckoutOpen(true);
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
  const discount = product.original_price ? discountPercent(product.original_price, product.price) : null;
  const name = lang === "bn" ? product.name_bn : product.name_en;
  const desc = lang === "bn" ? product.description_bn : product.description_en;
  const productId = product.id ?? product.slug;
  const waMsg = encodeURIComponent(`${lang === "bn" ? "অর্ডার করতে চাই" : "I want to order"}: ${name} - ${formatPrice(product.price)}`);

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6">
          <ChevronLeft className="w-4 h-4" />
          {lang === "bn" ? "পণ্যে ফিরে যান" : "Back to Products"}
        </button>

        <GlassCard className="overflow-hidden mb-10">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-white/10">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 mb-4">
                {images[selectedImage] ? (
                  <ImageZoom src={images[selectedImage]} alt={name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="w-20 h-20 text-brand-200" /></div>
                )}
                {discount && <span className="absolute top-3 right-3 badge bg-red-500 text-white z-10">-{discount}%</span>}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImage(i)} className={cn("w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0", selectedImage === i ? "border-brand-500" : "border-gray-200")}>
                      <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col">
              {product.category && <span className="text-xs uppercase tracking-wider text-brand-500 font-semibold mb-1">{product.category}</span>}
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">{name}</h1>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-accent-600">{formatPrice(product.price)}</span>
                {product.original_price && <span className="text-lg text-gray-400 line-through">{formatPrice(product.original_price)}</span>}
              </div>
              <div className="mb-4">
                {(product.stock_quantity ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    {t("in_stock")} ({product.stock_quantity})
                  </span>
                ) : (
                  <span className="text-red-500 text-sm font-medium">{t("out_of_stock")}</span>
                )}
              </div>
              {desc && <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">{desc}</p>}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mb-6">
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
                <button onClick={() => toggleWish({ product_id: productId, slug: product.slug, name_en: product.name_en, name_bn: product.name_bn, price: product.price, image_url: product.image_url })} className={cn("btn btn-outline btn-sm", wished(productId) && "text-accent-500 border-accent-300")}>
                  <Heart className={cn("w-4 h-4", wished(productId) && "fill-current")} />
                </button>
                <button onClick={() => { addCompare(product); toast("info", lang === "bn" ? "তুলনায় যোগ হয়েছে" : "Added to compare"); }} disabled={compared(productId)} className="btn btn-outline btn-sm">
                  <GitCompare className="w-4 h-4" />
                </button>
                <button onClick={handleShare} className="btn btn-outline btn-sm"><Share2 className="w-4 h-4" /></button>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm text-green-600">
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <button onClick={handleAdd} disabled={product.stock_quantity === 0} className={cn("btn btn-md w-full btn-ripple", added ? "btn-outline" : "btn-brand")}>
                  <ShoppingCart className="w-5 h-5" />
                  {added ? (lang === "bn" ? "যোগ হয়েছে!" : "Added!") : t("add_to_cart")}
                </button>
                <button onClick={handleBuyNow} disabled={product.stock_quantity === 0} className="btn btn-primary btn-md w-full btn-ripple">
                  <Zap className="w-5 h-5" />
                  {t("buy_now")}
                </button>
                {added && (
                  <button onClick={openCart} className="btn btn-ghost btn-sm">{lang === "bn" ? "কার্ট দেখুন" : "View Cart"}</button>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        <ProductReviews productId={product.id} />
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
      {checkoutOpen && <CheckoutModal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />}
    </main>
  );
}
