"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay, Pagination, A11y } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { promoSlidesApi } from "@/lib/api";
import type { PromoSlide } from "@/types";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/tokens";
import AutoVideo from "@/components/ui/AutoVideo";
import { cloudinarySrcSet, cloudinaryWidthUrl, PROMO_WIDTHS } from "@/lib/responsiveMediaUrl";

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
function PromoImage({ src, alt, eager, sizes, contain, onRatio }: { src: string; alt: string; eager?: boolean; sizes?: string; contain?: boolean; onRatio?: (r: number) => void }) {
  // The first (eager) slide is the page's LCP image: show it from the server HTML at once.
  // Hiding it until React hydrated (opacity-0 + spinner) delayed it ~9 s on slow phones.
  const [loaded, setLoaded] = useState(!!eager);
  const imgRef = useRef<HTMLImageElement>(null);
  // Server-rendered images can finish loading before React hydrates and
  // attaches onLoad — check `complete` so the spinner never sticks.
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete) {
      setLoaded(true);
      if (el.naturalWidth && el.naturalHeight) onRatio?.(el.naturalWidth / el.naturalHeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      {/* contain: the whole banner is shown (no text cut off when the upload is
          not the exact box ratio); a blurred copy fills the side space. */}
      {contain && (
         
        <img src={cloudinaryWidthUrl(src, 320)} alt="" aria-hidden loading="lazy" decoding="async"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-70" />
      )}
      { }
      <img
        ref={imgRef}
        // Cloudinary resizes + picks AVIF/WebP; other hosts get the raw URL.
        src={cloudinaryWidthUrl(src, 960)}
        srcSet={cloudinarySrcSet(src, PROMO_WIDTHS)}
        sizes={sizes}
        alt={alt}
        onLoad={(e) => {
          setLoaded(true);
          const el = e.currentTarget;
          if (el.naturalWidth && el.naturalHeight) onRatio?.(el.naturalWidth / el.naturalHeight);
        }}
        onError={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-300",
          contain ? "object-contain" : "object-cover",
          loaded ? "opacity-100" : "opacity-0"
        )}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
      />
    </>
  );
}

/** Ratio of a Tailwind aspect class ("aspect-[21/8]", "aspect-video"). */
function ratioOfClass(cls: string): number {
  const m = /aspect-\[(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\]/.exec(cls);
  return m ? Number(m[1]) / Number(m[2]) : 16 / 9;
}

/** The media box of one slide. It starts at the placement's recommended ratio and, once the
 * image has loaded, adopts the image's own ratio (within sane limits) — so any banner the
 * admin uploads is shown whole and fills the card edge to edge on every screen, with no
 * coloured side bars and nothing cropped. */
function SlideMedia({ aspect, knownRatio, onFit, children }: { aspect: string; knownRatio?: number | null; onFit: () => void; children: (onRatio: (r: number) => void) => React.ReactNode }) {
  const base = ratioOfClass(aspect);
  const [ratio, setRatio] = useState<number | null>(knownRatio ?? null);
  const fitted = ratio && ratio >= 1.2 && ratio <= 4.5 && Math.abs(ratio - base) / base > 0.03 ? ratio : null;
  useEffect(() => { if (fitted) onFit(); }, [fitted, onFit]);
  return (
    <div className={`relative w-full ${aspect} overflow-hidden`} style={fitted ? { aspectRatio: String(fitted) } : undefined}>
      {children(setRatio)}
    </div>
  );
}

interface Props {
  placement: "hero" | "flash_sale";
  /** Rendered when no slide is configured, so existing layouts never go blank. */
  fallback?: React.ReactNode;
  className?: string;
  /** Media box ratio. Hero uses a fixed 16/9 card; flash sale is wider. */
  aspect?: string;
  /** "contain" shows the whole banner (blurred fill on the sides) — nothing is cut off. */
  fit?: "cover" | "contain";
  /** Hero placement is above-the-fold on mobile (the LCP candidate) — its
   * first slide must not be `loading="lazy"`, which defers the fetch until
   * an intersection check and was measured adding real seconds to LCP.
   * flash_sale is below the fold, so it stays lazy. */
  eagerFirstSlide?: boolean;
  /** Slides fetched on the server (homepage) — rendered in the first HTML so
   * the hero image starts loading immediately. null/undefined = fetch here. */
  initialSlides?: PromoSlide[] | null;
  /** `sizes` hint for the responsive image srcset. */
  sizes?: string;
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
export default function PromoSlider({ placement, fallback, className, aspect = "aspect-video", eagerFirstSlide, initialSlides, sizes = "100vw", fit }: Props) {
  const { lang } = useLanguageStore();
  const [slides, setSlides] = useState<PromoSlide[] | null>(initialSlides ?? null);
  const hasInitial = initialSlides != null;

  useEffect(() => {
    if (hasInitial) return; // server already supplied fresh (60 s) slides
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
  }, [placement, hasInitial]);

  const swiperRef = useRef<SwiperType | null>(null);
  const refreshHeight = useCallback(() => { swiperRef.current?.updateAutoHeight(0); }, []);

  // null = still loading: render the fallback so there's no layout jump.
  if (!slides || slides.length === 0) return <>{fallback ?? null}</>;

  return (
    <div className={className}>
      <Swiper
        modules={[Autoplay, Pagination, A11y]}
        slidesPerView={1}
        autoHeight
        onSwiper={(sw) => { swiperRef.current = sw; }}
        // rewind instead of loop: loop clones the slides after hydration, which re-created the
        // first (LCP) image and delayed it by seconds on phones.
        rewind={slides.length > 1}
        autoplay={slides.length > 1 ? { delay: 4500, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        pagination={slides.length > 1 ? { clickable: true } : false}
        a11y={{ enabled: true }}
        className="promo-swiper w-full rounded-2xl lg:rounded-3xl overflow-hidden"
      >
        {slides.map((slide, index) => {
          const title = (lang === "bn" ? slide.title_bn : slide.title_en) || slide.title_en || "";
          const media = (
            <SlideMedia aspect={aspect} knownRatio={slide.aspect_ratio} onFit={refreshHeight}>
              {(onRatio) => slide.video_url ? (
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
                  sizes={sizes}
                  contain={fit ? fit === "contain" : true}
                  onRatio={onRatio}
                />
              )}
            </SlideMedia>
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
                if (path) return <Link href={path} className="block" aria-label={title || slide.alt_text || undefined}>{body}</Link>;
                if (external) return (
                  <a href={external} target="_blank" rel="noopener noreferrer" className="block" aria-label={title || slide.alt_text || undefined}>
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
