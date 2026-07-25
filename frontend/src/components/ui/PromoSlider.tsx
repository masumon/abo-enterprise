"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { promoSlidesApi } from "@/lib/api";
import type { PromoSlide } from "@/types";
import { useLanguageStore } from "@/store/language";
import AutoVideo from "@/components/ui/AutoVideo";

interface Props {
  placement: "hero" | "flash_sale";
  /** Rendered when no slide is configured, so existing layouts never go blank. */
  fallback?: React.ReactNode;
  className?: string;
  /** Media box ratio. Hero uses a fixed 16/9 card; flash sale is wider. */
  aspect?: string;
}

/**
 * Admin-managed promo carousel.
 *
 * Responsive by construction: one full-width slide at every breakpoint, media
 * scaled with object-cover inside a fixed-ratio box, so the card never changes
 * height between slides on mobile, tablet or desktop. Touch/swipe comes from
 * Swiper; autoplay pauses on interaction and is disabled for a single slide.
 *
 * Renders `fallback` (and fetches nothing further) when the API returns no
 * slides, which is what keeps the pre-existing single hero media working.
 */
export default function PromoSlider({ placement, fallback, className, aspect = "aspect-video" }: Props) {
  const { lang } = useLanguageStore();
  const [slides, setSlides] = useState<PromoSlide[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    promoSlidesApi
      .list(placement)
      .then((r) => {
        if (!cancelled) setSlides(r.data?.data ?? []);
      })
      .catch(() => {
        // Network/API failure must never blank the hero — fall back instead.
        if (!cancelled) setSlides([]);
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  // null = still loading: render the fallback so there's no layout jump.
  if (!slides || slides.length === 0) return <>{fallback ?? null}</>;

  return (
    <div className={className}>
      <Swiper
        modules={[Autoplay, Pagination, A11y]}
        slidesPerView={1}
        loop={slides.length > 1}
        autoplay={slides.length > 1 ? { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        pagination={slides.length > 1 ? { clickable: true } : false}
        a11y={{ enabled: true }}
        className="promo-swiper rounded-2xl lg:rounded-3xl overflow-hidden"
      >
        {slides.map((slide) => {
          const title = (lang === "bn" ? slide.title_bn : slide.title_en) || slide.title_en || "";
          const media = slide.video_url ? (
            <AutoVideo src={slide.video_url} className={`w-full ${aspect} object-cover block`} tapToPlay aria-hidden />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied promo art at arbitrary CDN sizes
            <img
              src={slide.image_url ?? ""}
              alt={slide.alt_text || title || ""}
              className={`w-full ${aspect} object-cover block`}
              loading="lazy"
            />
          );

          const body = (
            <div className="relative bg-black/20 border border-white/15 shadow-xl">
              {media}
              {title && (
                <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-black/55 backdrop-blur-sm">
                  <p className="text-white text-xs sm:text-sm font-semibold truncate">{title}</p>
                </div>
              )}
            </div>
          );

          return (
            <SwiperSlide key={slide.id}>
              {slide.link_url ? (
                slide.link_url.startsWith("/") ? (
                  <Link href={slide.link_url} className="block">{body}</Link>
                ) : (
                  <a href={slide.link_url} target="_blank" rel="noopener noreferrer" className="block">
                    {body}
                  </a>
                )
              ) : (
                body
              )}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
