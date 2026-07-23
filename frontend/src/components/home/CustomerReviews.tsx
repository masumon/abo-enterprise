"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/types";
import { useLanguageStore } from "@/store/language";
import { cacheApiResponse, getCachedApiResponse } from "@/lib/apiCache";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import GlassCard from "@/components/ui/GlassCard";
import { resolveReviewPhoto } from "@/lib/demoImages";

const FEATURED_REVIEWS_CACHE_KEY = "reviews:featured";

export default function CustomerReviews() {
  const { lang } = useLanguageStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedApiResponse<Review[]>(FEATURED_REVIEWS_CACHE_KEY)
      .then((cached) => {
        if (cached?.length) {
          setReviews(cached);
          setLoading(false);
        }
      })
      .catch((err) => console.warn("featured_reviews_cache_read_failed", err));

    reviewsApi
      .list({ featured: true, per_page: 8 })
      .then((r) => {
        const data = r.data.data ?? [];
        setReviews(data);
        if (data.length) {
          cacheApiResponse(FEATURED_REVIEWS_CACHE_KEY, data, 24 * 60).catch((err) =>
            console.warn("featured_reviews_cache_write_failed", err)
          );
        }
      })
      .catch(async (err) => {
        console.warn("featured_reviews_fetch_failed", err);
        const cached = await getCachedApiResponse<Review[]>(FEATURED_REVIEWS_CACHE_KEY);
        setReviews(cached ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  return (
    <section className="py-16 section-panel">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="ml-2 font-bold text-heading">{avg}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-heading mb-3">
            {lang === "bn" ? "গ্রাহকরা কী বলছেন?" : "Verified Client Reviews"}
          </h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="marquee-viewport" style={{ "--marquee-duration": "44s" } as React.CSSProperties}>
            <div className="marquee-track gap-5 px-2 py-1">
            {[...reviews, ...reviews].map((r, i) => (
              <GlassCard key={`${r.id}-${i}`} hover className="p-5 w-72 sm:w-80 flex-shrink-0" aria-hidden={i >= reviews.length}>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                  {r.is_verified && <BadgeCheck className="w-4 h-4 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-4">
                  &ldquo;{lang === "bn" && r.review_bn ? r.review_bn : r.review_en}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <Image src={resolveReviewPhoto(r.photo_url)} alt={r.customer_name} width={36} height={36} className="object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.customer_name}</p>
                    {r.company && <p className="text-xs text-gray-500">{r.company}</p>}
                  </div>
                </div>
              </GlassCard>
            ))}
            </div>
          </div>
        )}
        <div className="text-center mt-8">
          <Link href="/testimonials" className="btn btn-outline btn-sm">
            {lang === "bn" ? "সব রিভিউ দেখুন" : "View All Reviews"}
          </Link>
        </div>
      </div>
    </section>
  );
}
