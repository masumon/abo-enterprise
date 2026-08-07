"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { promoSlidesApi } from "@/lib/api";
import type { PromoSlide } from "@/types";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/tokens";
import AutoVideo from "@/components/ui/AutoVideo";

/** The site's own host (no leading www), for same-origin link detection. */
const SITE_HOST = (() => {
  try { return new URL(SITE_URL).hostname.replace(/^www\./, ""); }
  catch { return "aboenterprise.com"; }
})();

/**
 * Resolve a slide's link to an in-app path when it points at our own site —
 * even if the admin pasted the full URL (e.g. "www.aboenterprise.com/products").
 * Those then navigate via <Link> in the same tab (fast, no full reload / black
 * flash), while genuinely external links still open in a new tab.
 * Returns null for an internal target (use `path`), or the raw url as external.
 */
function resolveSlideLink(raw?: string | null): { path: string | null; external: string | null } {
  const url = (raw ?? "").trim();
  if (!url) return { path: null, external: null };
  if (url.startsWith("/")) return { path: url, external: null };            // already relative
  if (url.startsWith("#")) return { path: url, external: null };            // in-page anchor
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(withScheme);
    if (u.hostname.replace(/^www\./, "") === SITE_HOST) {
      return { path: (u.pathname || "/") + u.search + u.hash, external: null };
    }
  } catch { /* not a parseable URL — treat as external below */ }
  return { path: null, external: url };
}

/**
 * A promo image that shows the site's loading spinner over a soft brand
 * placeholder until it has decoded, then fades in. Fixes the "black flash" a
 * slow banner image used to leave while the browser fetched it.
 */
function PromoImage({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/40 dark:to-brand-800/30"
          aria-hidden
        >
          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-brand-500 dark:text-brand-300 animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied promo art at arbitrary CDN sizes */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        loading={eager ? "eager" : "lazy"}
      />
    </>
  );
}

interface Props {
  placement: "hero" | "flash_sale";
  /** Rendered when no slide is configured, so existing layouts never go blank. */
  fallback?: React.ReactNode;
  className?: string;
  /** Media box ratio. Hero uses a fixed 16/9 card; flash sale is wider. */
  aspect?: string;
  /** Hero placement is above-the-fold on mobile (the LCP candidate) — its
   * first slide must not be `loading="lazy"`, which defers the fetch until
   * an intersection check and was measured adding real seconds to LCP.
   * flash_sale is below the fold, so it stays lazy. */
  eagerFirstSlide?: boolean;
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
export default function PromoSlider({ placement, fallback, className, aspect = "aspect-video", eagerFirstSlide }: Props) {
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
        className="promo-swiper w-full rounded-2xl lg:rounded-3xl overflow-hidden"
      >
        {slides.map((slide, index) => {
          const title = (lang === "bn" ? slide.title_bn : slide.title_en) || slide.title_en || "";
          const media = (
            <div className={`relative w-full ${aspect} overflow-hidden`}>
              {slide.video_url ? (
                <AutoVideo
                  src={slide.video_url}
                  className="absolute inset-0 w-full h-full object-cover"
                  tapToPlay
                  aria-hidden
                />
              ) : (
                <PromoImage
                  src={slide.image_url ?? ""}
                  alt={slide.alt_text || title || ""}
                  eager={eagerFirstSlide && index === 0}
                />
              )}
            </div>
          );

          const body = (
            <div className="relative bg-brand-50 dark:bg-brand-900/30 border border-black/5 dark:border-white/10 shadow-xl">
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
              {(() => {
                const { path, external } = resolveSlideLink(slide.link_url);
                if (path) return <Link href={path} className="block">{body}</Link>;
                if (external) return (
                  <a href={external} target="_blank" rel="noopener noreferrer" className="block">
                    {body}
                  </a>
                );
                return body;
              })()}
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
