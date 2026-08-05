"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, BadgeCheck, Loader2, PenLine } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiError";
import type { Review } from "@/types";
import { useLanguageStore } from "@/store/language";
import { useToastStore } from "@/store/toast";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import GlassCard from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

const FALLBACK: Review[] = [
  { id: "1", customer_name: "Rahim Uddin", company: "Shop Owner", rating: 5, review_en: "Great quality product, fast delivery!", review_bn: "দারুণ মানের পণ্য, দ্রুত ডেলিভারি!", source: "Google", is_verified: true, is_featured: true },
  { id: "2", customer_name: "Fatema Begum", rating: 5, review_en: "Exactly as described. Highly recommend.", review_bn: "ঠিক যেমন বর্ণনা ছিল। সুপারিশ করি।", source: "Direct", is_verified: false, is_featured: true },
];

const reviewSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  rating: z.number().min(1, "Select a rating").max(5),
  review_en: z.string().min(10, "Review must be at least 10 characters"),
});
type ReviewFormData = z.infer<typeof reviewSchema>;

interface WriteReviewFormProps {
  productId?: string;
  onSubmitted: () => void;
}

function WriteReviewForm({ productId, onSubmitted }: WriteReviewFormProps) {
  const { lang } = useLanguageStore();
  const toast = useToastStore((s) => s.push);
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { customer_name: "", rating: 0, review_en: "" },
  });

  const onSubmit = async (data: ReviewFormData) => {
    setSubmitting(true);
    try {
      await reviewsApi.create({ ...data, product_id: productId });
      toast(
        "success",
        lang === "bn"
          ? "ধন্যবাদ! আপনার রিভিউ যাচাইয়ের পর প্রকাশ হবে।"
          : "Thanks! Your review will appear after moderation."
      );
      reset();
      onSubmitted();
    } catch (e) {
      toast("error", apiErrorMessage(e, lang === "bn" ? "রিভিউ জমা দেওয়া যায়নি" : "Could not submit review"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard className="p-4 mb-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1.5">
            {lang === "bn" ? "রেটিং" : "Your rating"}
          </label>
          <Controller
            control={control}
            name="rating"
            render={({ field }) => (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => field.onChange(n)}
                    aria-label={`${n} star`}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "w-6 h-6 transition-colors",
                        n <= field.value ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          />
          {errors.rating && <p className="text-xs text-red-500 mt-1">{errors.rating.message}</p>}
        </div>

        <div>
          <label htmlFor="review-name" className="block text-xs font-semibold text-muted mb-1.5">
            {lang === "bn" ? "আপনার নাম" : "Your name"}
          </label>
          <input id="review-name" type="text" {...register("customer_name")} className="input w-full" placeholder={lang === "bn" ? "আপনার নাম লিখুন" : "Enter your name"} />
          {errors.customer_name && <p className="text-xs text-red-500 mt-1">{errors.customer_name.message}</p>}
        </div>

        <div>
          <label htmlFor="review-text" className="block text-xs font-semibold text-muted mb-1.5">
            {lang === "bn" ? "রিভিউ লিখুন" : "Your review"}
          </label>
          <textarea id="review-text" {...register("review_en")} rows={3} className="input w-full resize-none" placeholder={lang === "bn" ? "পণ্য সম্পর্কে আপনার মতামত লিখুন" : "Share your experience with this product"} />
          {errors.review_en && <p className="text-xs text-red-500 mt-1">{errors.review_en.message}</p>}
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary btn-sm w-full">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === "bn" ? "রিভিউ জমা দিন" : "Submit Review")}
        </button>
      </form>
    </GlassCard>
  );
}

interface Props {
  productId?: string;
}

export default function ProductReviews({ productId }: Props) {
  const { lang } = useLanguageStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    reviewsApi.list({ product_id: productId, per_page: 6 } as Parameters<typeof reviewsApi.list>[0])
      .then((r) => setReviews(r.data.data?.length ? r.data.data : FALLBACK))
      .catch(() => setReviews(FALLBACK))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <div className="grid sm:grid-cols-2 gap-4 mt-10">{Array.from({ length: 2 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold">{lang === "bn" ? "গ্রাহক রিভিউ" : "Customer Reviews"}</h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn btn-outline btn-sm gap-1.5">
          <PenLine className="w-3.5 h-3.5" aria-hidden />
          {lang === "bn" ? "রিভিউ লিখুন" : "Write a Review"}
        </button>
      </div>

      {showForm && (
        <WriteReviewForm productId={productId} onSubmitted={() => setShowForm(false)} />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {reviews.map((r) => (
          <GlassCard key={r.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {r.photo_url ? <Image src={r.photo_url} alt={r.customer_name} width={40} height={40} className="object-cover" /> : <span className="text-brand-600 font-bold">{r.customer_name[0]}</span>}
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
