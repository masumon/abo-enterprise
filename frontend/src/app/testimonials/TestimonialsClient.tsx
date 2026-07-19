"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, BadgeCheck, MessageCircle, Send } from "lucide-react";
import { reviewsApi } from "@/lib/api";
import type { Review } from "@/types";
import { useLanguageStore } from "@/store/language";
import PageHero from "@/components/ui/PageHero";
import GlassCard from "@/components/ui/GlassCard";
import Reveal from "@/components/ui/Reveal";
import { ProductCardSkeleton } from "@/components/common/Skeletons";
import { useToastStore } from "@/store/toast";
import { cacheApiResponse, getCachedApiResponse } from "@/lib/apiCache";

const TESTIMONIALS_CACHE_KEY = "reviews:testimonials";

export default function TestimonialsClient() {
  const { lang } = useLanguageStore();
  const toast = useToastStore((s) => s.push);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCachedApiResponse<Review[]>(TESTIMONIALS_CACHE_KEY)
      .then((cached) => {
        if (cached?.length) {
          setReviews(cached);
          setLoading(false);
        }
      })
      .catch((err) => console.warn("testimonials_cache_read_failed", err));

    reviewsApi
      .list({ per_page: 12 })
      .then((r) => {
        const data = r.data.data ?? [];
        setReviews(data);
        if (data.length) {
          cacheApiResponse(TESTIMONIALS_CACHE_KEY, data, 24 * 60).catch((err) =>
            console.warn("testimonials_cache_write_failed", err)
          );
        }
      })
      .catch(async (err) => {
        console.warn("testimonials_fetch_failed", err);
        const cached = await getCachedApiResponse<Review[]>(TESTIMONIALS_CACHE_KEY);
        setReviews(cached ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "5.0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      toast("error", lang === "bn" ? "নাম দিন" : "Please enter your name");
      return;
    }
    if (!message.trim()) {
      toast("error", lang === "bn" ? "রিভিউ লিখুন" : "Please write your review");
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.create({
        customer_name: name.trim(),
        rating,
        review_en: message.trim(),
        review_bn: lang === "bn" ? message.trim() : undefined,
        source: "website",
      });
      toast(
        "success",
        lang === "bn"
          ? "ধন্যবাদ! রিভিউ জমা হয়েছে — অনুমোদনের পর প্রকাশিত হবে।"
          : "Thank you! Your review was submitted and will appear after approval."
      );
      setName("");
      setMessage("");
      setRating(5);
    } catch {
      toast("error", lang === "bn" ? "রিভিউ জমা দেওয়া যায়নি।" : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <PageHero
        pageKey="testimonials"
        title={lang === "bn" ? "গ্রাহক পর্যালোচনা" : "Customer Testimonials"}
        subtitle={lang === "bn" ? "আমাদের গ্রাহকরা কী বলছেন" : "What our clients say about us"}
        breadcrumbs={[{ label: lang === "bn" ? "পর্যালোচনা" : "Testimonials" }]}
      >
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
          <span className="font-bold text-white text-lg">{avg}</span>
          <span className="text-white/70 text-sm">({reviews.length} {lang === "bn" ? "রিভিউ" : "reviews"})</span>
        </div>
      </PageHero>

      <section className="enterprise-section">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((r, i) => (
                <Reveal key={r.id} as="div" delay={(i % 6) * 60} className="h-full">
                <GlassCard hover className="p-5 h-full">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                    {r.is_verified && <BadgeCheck className="w-4 h-4 text-green-500 ml-auto" />}
                  </div>
                  <p className="text-sm text-muted mb-4 line-clamp-5">
                    &ldquo;{lang === "bn" && r.review_bn ? r.review_bn : r.review_en}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                      {r.photo_url ? <Image src={r.photo_url} alt="" width={36} height={36} className="object-cover" /> : <span className="text-brand-600 font-bold text-sm">{r.customer_name[0]}</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-heading">{r.customer_name}</p>
                      {r.company && <p className="text-xs text-muted">{r.company}</p>}
                    </div>
                  </div>
                </GlassCard>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="enterprise-section-alt">
        <div className="container mx-auto px-4 max-w-xl">
          <h2 className="text-2xl font-bold text-heading text-center mb-6">
            {lang === "bn" ? "আপনার রিভিউ দিন" : "Share Your Experience"}
          </h2>
          <form onSubmit={handleSubmit} className="enterprise-card p-6 space-y-4">
            <div>
              <label className="form-label">{lang === "bn" ? "নাম" : "Name"}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="form-label">{lang === "bn" ? "রেটিং" : "Rating"}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
                    <Star className={`w-6 h-6 ${n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">{lang === "bn" ? "আপনার মতামত" : "Your Review"}</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="input resize-none" required />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-brand btn-md w-full">
              <Send className="w-4 h-4" />
              {lang === "bn" ? "জমা দিন" : "Submit Review"}
            </button>
          </form>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4 text-center">
          <a href="https://wa.me/8801825007977" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-md">
            <MessageCircle className="w-4 h-4" />
            {lang === "bn" ? "WhatsApp-এ ভিডিও রিভিউ পাঠান" : "Send video review on WhatsApp"}
          </a>
        </div>
      </section>
    </main>
  );
}
