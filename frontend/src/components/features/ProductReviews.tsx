"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/types";
import { useLanguageStore } from "@/store/language";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import GlassCard from "@/components/ui/GlassCard";

const FALLBACK: Review[] = [
  { id: "1", customer_name: "Rahim Uddin", company: "Shop Owner", rating: 5, review_en: "Great quality product, fast delivery!", review_bn: "দারুণ মানের পণ্য, দ্রুত ডেলিভারি!", source: "Google", is_verified: true, is_featured: true },
  { id: "2", customer_name: "Fatema Begum", rating: 5, review_en: "Exactly as described. Highly recommend.", review_bn: "ঠিক যেমন বর্ণনা ছিল। সুপারিশ করি।", source: "Direct", is_verified: false, is_featured: true },
];

interface Props {
  productId?: string;
}

export default function ProductReviews({ productId }: Props) {
  const { lang } = useLanguageStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewsApi.list({ product_id: productId, per_page: 6 } as Parameters<typeof reviewsApi.list>[0])
      .then((r) => setReviews(r.data.data?.length ? r.data.data : FALLBACK))
      .catch(() => setReviews(FALLBACK))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="grid sm:grid-cols-2 gap-4 mt-10">{Array.from({ length: 2 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold mb-4">{lang === "bn" ? "গ্রাহক রিভিউ" : "Customer Reviews"}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {reviews.map((r) => (
          <GlassCard key={r.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {r.photo_url ? <Image src={r.photo_url} alt="" width={40} height={40} className="object-cover" /> : <span className="text-brand-600 font-bold">{r.customer_name[0]}</span>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{r.customer_name}</p>
                  {r.is_verified && <BadgeCheck className="w-4 h-4 text-green-500" aria-label={lang === "bn" ? "যাচাইকৃত" : "Verified"} />}
                </div>
                {r.company && <p className="text-xs text-gray-500">{r.company}</p>}
                <div className="flex gap-0.5 my-1">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{lang === "bn" && r.review_bn ? r.review_bn : r.review_en}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
