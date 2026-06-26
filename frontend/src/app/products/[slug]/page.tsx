"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Star, ChevronLeft, Package, Loader2, CheckCircle } from "lucide-react";
import { productsApi } from "@/lib/api";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cart";
import { useLanguageStore } from "@/store/language";
import { formatPrice, discountPercent, cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem, openCart } = useCartStore();
  const { lang } = useLanguageStore();

  useEffect(() => {
    productsApi.get(slug)
      .then(r => setProduct(r.data.data as Product))
      .catch(() => router.replace("/products"))
      .finally(() => setLoading(false));
  }, [slug, router]);

  const handleAdd = () => {
    if (!product) return;
    addItem({
      product_id: product.id ?? product.slug,
      name_en: product.name_en,
      name_bn: product.name_bn,
      price: product.price,
      image_url: product.image_url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </main>
    );
  }

  if (!product) return null;

  const images = [product.image_url, ...(product.images ?? [])].filter(Boolean) as string[];
  const discount = product.original_price ? discountPercent(product.original_price, product.price) : null;
  const name = lang === "bn" ? product.name_bn : product.name_en;
  const desc = lang === "bn" ? product.description_bn : product.description_en;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Products
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Images */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 mb-4">
                {images[selectedImage] ? (
                  <Image src={images[selectedImage]} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-20 h-20 text-brand-200" />
                  </div>
                )}
                {discount && (
                  <span className="absolute top-3 right-3 badge bg-red-500 text-white">-{discount}%</span>
                )}
                {product.badge && (
                  <span className={cn("absolute top-3 left-3 badge",
                    product.badge === "HOT" && "badge-hot",
                    product.badge === "NEW" && "badge-new",
                    product.badge === "SALE" && "badge-sale"
                  )}>
                    {product.badge}
                  </span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={cn(
                        "w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors",
                        selectedImage === i ? "border-brand-500" : "border-gray-200"
                      )}
                    >
                      <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-6 flex flex-col">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                <span className="text-sm text-gray-500 ml-1">(4.8)</span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-3xl font-bold text-accent-500">{formatPrice(product.price)}</span>
                {product.original_price && (
                  <span className="text-lg text-gray-400 line-through">{formatPrice(product.original_price)}</span>
                )}
              </div>

              {/* Stock */}
              <div className="mb-4">
                {(product.stock_quantity ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    In Stock ({product.stock_quantity} available)
                  </span>
                ) : (
                  <span className="text-red-500 text-sm font-medium">Out of Stock</span>
                )}
              </div>

              {/* Description */}
              {desc && (
                <p className="text-gray-600 text-sm leading-relaxed mb-6">{desc}</p>
              )}

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm">Specifications</h3>
                  <div className="space-y-2">
                    {Object.entries(product.specifications).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-900 font-medium">{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex flex-col gap-3">
                <button
                  onClick={handleAdd}
                  disabled={product.stock_quantity === 0}
                  className={cn("btn btn-md w-full", added ? "btn-outline" : "btn-brand")}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {added
                    ? (lang === "bn" ? "যোগ হয়েছে!" : "Added!")
                    : product.stock_quantity === 0
                      ? (lang === "bn" ? "স্টক নেই" : "Out of Stock")
                      : (lang === "bn" ? "কার্টে যোগ করুন" : "Add to Cart")}
                </button>
                {added && (
                  <button onClick={openCart} className="btn btn-brand btn-md w-full">
                    View Cart & Checkout
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
