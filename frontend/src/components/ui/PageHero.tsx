"use client";

import Breadcrumb from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";
import { isVideoUrl } from "@/lib/media";
import AutoVideo from "@/components/ui/AutoVideo";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import {
  bannerSettingKey,
  resolvePageBannerImage,
  type PageBannerKey,
} from "@/lib/pageBanners";
import { responsiveMediaUrl } from "@/lib/responsiveMediaUrl";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeroProps {
  /** Loads demo banner + admin override from settings (`banner_{key}_image_url`). */
  pageKey?: PageBannerKey;
  /** Explicit image URL — overrides pageKey/settings (e.g. service featured image). */
  imageUrl?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  variant?: "brand" | "light";
  badge?: string;
  align?: "left" | "center";
  children?: React.ReactNode;
}

export default function PageHero({
  pageKey,
  imageUrl,
  title,
  subtitle,
  breadcrumbs,
  variant = "brand",
  badge,
  align = "left",
  children,
}: PageHeroProps) {
  const settingKey = pageKey ? bannerSettingKey(pageKey) : null;
  const { settings } = usePublicSettings(settingKey ? [settingKey] : []);

  const resolvedImage =
    imageUrl?.trim() ||
    (pageKey ? resolvePageBannerImage(settings, pageKey) : "") ||
    null;

  const isBrand = variant === "brand";
  const hasImage = !!resolvedImage;
  const isVideo = hasImage && isVideoUrl(resolvedImage);
  const isCenter = align === "center";

  // Keep the image visible while preserving text contrast. The image is now a
  // separate layer so Cloudinary can deliver mobile/tablet/desktop crops.
  const overlayGradient = isBrand
    ? "linear-gradient(135deg, rgba(10,22,40,0.56) 0%, rgba(53,71,155,0.48) 48%, rgba(30,43,107,0.54) 100%)"
    : "linear-gradient(180deg, rgba(248,250,255,0.78) 0%, rgba(236,242,255,0.72) 100%)";

  return (
    <section
      className={cn(
        "relative overflow-hidden px-4 -mt-[var(--navbar-offset)]",
        isBrand
          ? cn(
              // Mobile is a compact strip; desktop keeps the taller hero.
              "text-white py-6 md:py-20 pt-[calc(var(--navbar-offset)+1.25rem)] md:pt-[calc(var(--navbar-offset)+3.5rem)]",
              // Always painted: it is the branded placeholder while a banner photo loads.
              "gradient-brand"
            )
          : cn(
              "page-surface border-b border-gray-100 dark:border-white/10 py-5 md:py-16 pt-[calc(var(--navbar-offset)+1rem)] md:pt-[calc(var(--navbar-offset)+3rem)]",
              !hasImage && "bg-gradient-to-b from-brand-50 to-white dark:from-brand-900 dark:to-[#0a1020]"
            )
      )}
    >
      {hasImage && !isVideo && (
        <picture className="absolute inset-0 block" aria-hidden="true">
          <source
            media="(max-width: 767px)"
            srcSet={responsiveMediaUrl(resolvedImage!, "page-banner", "mobile")}
          />
          <source
            media="(max-width: 1199px)"
            srcSet={responsiveMediaUrl(resolvedImage!, "page-banner", "tablet")}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- responsive Cloudinary background layer */}
          <img
            src={responsiveMediaUrl(resolvedImage!, "page-banner", "desktop")}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0" style={{ background: overlayGradient }} />
          {isBrand && (
            // Extra scrim behind the title column: banners often have their own baked-in text.
            <div
              className="absolute inset-x-0 bottom-0 top-[var(--navbar-offset)] hidden lg:block"
              style={{
                background: "linear-gradient(90deg, rgba(10,22,40,0.84) 0%, rgba(10,22,40,0.72) 45%, rgba(10,22,40,0.34) 75%, rgba(10,22,40,0.14) 100%)",
                // Soft blur so text baked into the banner image can't compete with the page title.
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                // start below the navbar and fade in, so nav links stay readable
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 70px)",
                maskImage: "linear-gradient(to bottom, transparent 0, #000 70px)",
              }}
            />
          )}
          {isBrand && (
            // Desktop: blur only the title side (fades out to the right) so
            // text baked into the banner can't compete with the page title,
            // while the right side of the photo stays sharp.
            <div
              className="absolute inset-0 hidden lg:block"
              style={{
                backdropFilter: "blur(5px)",
                WebkitBackdropFilter: "blur(5px)",
                WebkitMaskImage: "linear-gradient(90deg, #000 0%, #000 50%, transparent 80%)",
                maskImage: "linear-gradient(90deg, #000 0%, #000 50%, transparent 80%)",
              }}
            />
          )}
          {isBrand && (
            // Phones AND tablets (<1024px): the title spans most of the banner
            // width, so it always lands on the banner's own baked-in text.
            // Darken + blur the whole picture there so only the page title reads.
            <div
              className="absolute inset-0 lg:hidden"
              style={{ background: "rgba(10,22,40,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            />
          )}
        </picture>
      )}

      {isVideo && (
        <>
          <AutoVideo
            src={resolvedImage!}
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden
          />
          <div className="absolute inset-0" style={{ background: overlayGradient }} aria-hidden />
        </>
      )}

      {isBrand && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {/* Dot-grid + layered glows give the strip the homepage hero's depth. */}
          <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle,rgba(255,255,255,0.5)_1px,transparent_1.5px)] [background-size:20px_20px]" />
          <div className="absolute -top-10 right-0 w-80 h-80 bg-white/[0.07] rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-16 left-0 w-72 h-72 bg-accent-500/15 rounded-full blur-3xl" />
          <div className="absolute top-0 left-1/3 w-64 h-40 bg-brand-400/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.10),transparent_45%)]" />
        </div>
      )}

      <div
        className={cn(
          "container mx-auto max-w-5xl relative z-10",
          isCenter && "text-center"
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb
            items={breadcrumbs}
            className={cn(
              isCenter && "justify-center",
              isBrand
                ? "text-white/70 [&_a]:text-white/80 [&_a:hover]:text-white [&_[aria-current]]:!text-white"
                : undefined
            )}
          />
        )}

        {badge && (
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3 mt-2",
              isBrand
                ? "bg-gradient-to-r from-white/20 to-white/10 text-white border border-white/25 backdrop-blur-md shadow-sm"
                : "bg-brand-50 text-brand-700 border border-brand-100"
            )}
          >
            {badge}
          </span>
        )}

        <h1
          className={cn(
            "text-[1.4rem] sm:text-3xl md:text-5xl font-bold mb-1.5 md:mb-3 text-balance leading-tight tracking-tight",
            isBrand ? "drop-shadow-sm [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]" : "text-heading",
            isCenter && "mx-auto"
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className={cn(
              "text-[13px] sm:text-sm md:text-lg max-w-2xl leading-snug md:leading-relaxed",
              isBrand ? "text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]" : "text-muted",
              isCenter && "mx-auto"
            )}
          >
            {subtitle}
          </p>
        )}

        {children && (
          <div className={cn(isCenter && "flex flex-col items-center")}>{children}</div>
        )}
      </div>

      {isBrand && (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" aria-hidden>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" fill="none" className="w-full h-6 md:h-8 block">
            <path
              d="M0 48L48 42C96 36 192 24 288 20C384 16 480 24 576 30C672 36 768 42 864 38C960 34 1056 20 1152 16C1248 12 1344 20 1392 24L1440 28V48H0Z"
              fill="var(--surface, #fafbff)"
              className="dark:fill-[#0a1628]"
            />
          </svg>
        </div>
      )}
    </section>
  );
}
