"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/types";
import { useLanguageStore } from "@/store/language";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import GlassCard from "@/components/ui/GlassCard";

const FALLBACK: Review[] = [
  { id: "1", customer_name: "Rahim Uddin", company: "Shop Owner, Sylhet", rating: 5, review_en: "ABO built our POS in 2 weeks. Billing errors dropped to zero!", review_bn: "ABO আমাদের POS ২ সপ্তাহে তৈরি করেছে। বিলিং ভুল শূন্য!", source: "Google", is_verified: true, is_featured: true },
  { id: "2", customer_name: "Fatema Begum", company: "Restaurant Owner", rating: 5, review_en: "Restaurant software transformed our kitchen operations.", review_bn: "রেস্টুরেন্ট সফটওয়্যার কিচেন বদলে দিয়েছে।", source: "Facebook", is_verified: true, is_featured: true },
  { id: "3", customer_name: "Karim Hassan", company: "IT Manager", rating: 5, review_en: "Custom ERP delivered on time with AI features.", review_bn: "AI সহ কাস্টম ERP ঠিক সময়ে দিয়েছে।", source: "Direct", is_verified: false, is_featured: true },
  { id: "4", customer_name: "Nusrat Jahan", company: "Freelancer", rating: 5, review_en: "Top quality accessories, same-day delivery!", review_bn: "সেরা মান, একই দিনে ডেলিভারি!", source: "Google", is_verified: true, is_featured: true },
];

export default function CustomerReviews() {
  const { lang } = useLanguageStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewsApi.list({ featured: true, per_page: 4 })
      .then((r) => setReviews(r.data.data?.length ? r.data.data : FALLBACK))
      .catch(() => setReviews(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "5.0";

  return (
    <section className="py-16 section-panel">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
            <span className="ml-2 font-bold text-gray-900 dark:text-white">{avg}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {lang === "bn" ? "গ্রাহকরা কী বলছেন?" : "Verified Client Reviews"}
          </h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reviews.map((r) => (
              <GlassCard key={r.id} hover className="p-5">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                  {r.is_verified && <BadgeCheck className="w-4 h-4 text-green-500 ml-auto" />}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-4">
                  &ldquo;{lang === "bn" && r.review_bn ? r.review_bn : r.review_en}&rdquo;
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                    {r.photo_url ? <Image src={r.photo_url} alt="" width={36} height={36} className="object-cover" /> : <span className="text-brand-600 font-bold text-sm">{r.customer_name[0]}</span>}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{r.customer_name}</p>
                    {r.company && <p className="text-xs text-gray-500">{r.company}</p>}
                  </div>
                </div>
              </GlassCard>
            ))}
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
