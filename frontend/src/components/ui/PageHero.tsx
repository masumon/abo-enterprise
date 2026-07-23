"use client";

import Breadcrumb from "@/components/ui/Breadcrumb";
import { cn } from "@/lib/utils";
import { isVideoUrl, toPlayableVideoUrl } from "@/lib/media";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import {
  bannerSettingKey,
  resolvePageBannerImage,
  type PageBannerKey,
} from "@/lib/pageBanners";

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

  // The gradient overlay (kept separate for the video case, where a CSS
  // background can't play the clip).
  const overlayGradient = isBrand
    ? "linear-gradient(135deg, rgba(10,22,40,0.9) 0%, rgba(21,101,192,0.82) 48%, rgba(13,71,161,0.88) 100%)"
    : "linear-gradient(180deg, rgba(248,250,255,0.93) 0%, rgba(236,242,255,0.9) 100%)";

  const sectionStyle = hasImage && !isVideo
    ? {
        backgroundImage: `${overlayGradient}, url(${resolvedImage})`,
        backgroundSize: "cover",
        backgroundPosition: isBrand ? "center" : "center top",
      }
    : undefined;

  return (
    <section
      className={cn(
        "relative overflow-hidden px-4 -mt-[var(--navbar-offset)]",
        isBrand
          ? cn(
              // Mobile is a compact strip (~72px); desktop keeps the tall hero.
              "text-white py-6 md:py-20 pt-[calc(var(--navbar-offset)+1.25rem)] md:pt-[calc(var(--navbar-offset)+3.5rem)]",
              !hasImage && "gradient-brand"
            )
          : cn(
              "page-surface border-b border-gray-100 dark:border-white/10 py-5 md:py-16 pt-[calc(var(--navbar-offset)+1rem)] md:pt-[calc(var(--navbar-offset)+3rem)]",
              !hasImage && "bg-gradient-to-b from-slate-50 to-white dark:from-[#0f1a2e] dark:to-[#0a1628]"
            )
      )}
      style={sectionStyle}
    >
      {isVideo && (
        <>
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={toPlayableVideoUrl(resolvedImage!)}
            autoPlay
            muted
            loop
            playsInline
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
                ? "text-white/70 [&_a]:text-white/80 [&_a:hover]:text-white"
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
            isBrand ? "drop-shadow-sm" : "text-heading",
            isCenter && "mx-auto"
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p
            className={cn(
              "text-[13px] sm:text-sm md:text-lg max-w-2xl leading-snug md:leading-relaxed",
              isBrand ? "text-white/85" : "text-muted",
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
          <svg viewBox="0 0 1440 48" fill="none" className="w-full h-6 md:h-8">
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
