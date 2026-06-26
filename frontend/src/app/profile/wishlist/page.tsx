"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ArrowRight } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useWishlistStore } from "@/store/wishlist";
import { formatPrice } from "@/lib/utils";
import GlassCard from "@/components/ui/GlassCard";

export default function WishlistPage() {
  const { lang } = useLanguageStore();
  const { items, remove } = useWishlistStore();

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-accent-500" />
          {lang === "bn" ? "আমার উইশলিস্ট" : "My Wishlist"}
        </h1>
        {items.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">{lang === "bn" ? "উইশলিস্ট খালি" : "Wishlist is empty"}</p>
            <Link href="/products" className="btn btn-brand btn-md mt-4 inline-flex">
              {lang === "bn" ? "পণ্য দেখুন" : "Browse Products"}
            </Link>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <GlassCard key={item.product_id} className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-brand-50 overflow-hidden flex-shrink-0">
                  {item.image_url && (
                    <Image src={item.image_url} alt={item.name_en} width={64} height={64} className="object-cover w-full h-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{lang === "bn" ? item.name_bn : item.name_en}</p>
                  <p className="text-accent-600 font-bold">{formatPrice(item.price)}</p>
                </div>
                <Link href={`/products/${item.slug}`} className="btn btn-outline btn-sm">
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button onClick={() => remove(item.product_id)} className="text-gray-400 hover:text-red-500 p-2" aria-label="Remove">
                  <Heart className="w-5 h-5 fill-current text-accent-400" />
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
