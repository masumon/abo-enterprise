"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { ABO_ACRONYM } from "@/lib/tokens";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { usePublicStats } from "@/hooks/usePublicStats";
import { resolveHomeBannerImage } from "@/lib/pageBanners";
import { isVideoUrl } from "@/lib/media";
import AutoVideo from "@/components/ui/AutoVideo";
import PromoSlider from "@/components/ui/PromoSlider";
import HomeSearchBar from "@/components/home/HomeSearchBar";
import { cn } from "@/lib/utils";
import {
  HERO_TEXT_STYLE_KEY,
  parseHeroTextStyle,
  heroTitleClass,
  heroSubClass,
  heroNoteClass,
  heroPillClass,
  heroAlignClass,
  heroVAlignClass,
} from "@/lib/heroTextStyle";
import { cloudinarySrcSet, HERO_BG_WIDTHS } from "@/lib/responsiveMediaUrl";
import type { PromoSlide } from "@/types";

interface ActivityItem {
  icon: string;
  text_en: string;
  text_bn: string;
  time: string;
}

// The activity feed is public: never show full order/booking references.
export function maskPublicRefs(text: string): string {
  return text.replace(/ABO-[A-Za-z0-9-]+/g, "ABO-••••");
}

export function getFreeDeliveryLabel(lang: "bn" | "en", rawAmount: string): string | null {
  const amount = rawAmount.trim();
  if (!amount) return null;
  return lang === "bn"
    ? `সিলেটে ফ্রি ডেলিভারি ৳${amount}+`
    : `Free Sylhet delivery ৳${amount}+`;
}

/** 1×1 transparent GIF: the <img> fallback inside the desktop <picture>, so
 * phones/tablets (where the desktop hero is hidden) download nothing. */
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const HERO_TINT = "linear-gradient(135deg, rgba(53,71,155,0.25) 0%, rgba(30,43,107,0.20) 50%, rgba(228,161,27,0.15) 100%)";

export default function Hero({ initialHeroSlides }: { initialHeroSlides?: PromoSlide[] | null } = {}) {
  const { lang } = useLanguageStore();
  const t = useT();
  const { settings } = usePublicSettings(["hero_image_url", "hero_mobile_image_url", "hero_promo_media_url", "hero_title_en", "hero_title_bn", "hero_subtitle_en", "hero_subtitle_bn", "hero_cta_text", "hero_cta_url", "hero_note_en", "hero_note_bn", "hero_pill1_bn", "hero_pill2_bn", "hero_pill3_bn", "hero_pill1_en", "hero_pill2_en", "hero_pill3_en", "hero_pill1_url", "hero_pill2_url", "hero_pill3_url", "free_delivery_min_amount", HERO_TEXT_STYLE_KEY]);
  const { stats, loading: statsLoading } = usePublicStats();

  const heroImage = resolveHomeBannerImage(settings);
  const heroIsVideo = isVideoUrl(heroImage);
  const heroMobileImg = getSettingValue(settings, "hero_mobile_image_url");
  const heroPromoMedia = getSettingValue(settings, "hero_promo_media_url");
  const heroTitleOverride = lang === "bn"
    ? getSettingValue(settings, "hero_title_bn")
    : getSettingValue(settings, "hero_title_en");
  const heroSubtitle = lang === "bn"
    ? getSettingValue(settings, "hero_subtitle_bn") || t("hero_sub")
    : getSettingValue(settings, "hero_subtitle_en") || t("hero_sub");
  const heroCtaText = getSettingValue(settings, "hero_cta_text");
  const heroCtaUrl = getSettingValue(settings, "hero_cta_url", "/products");
  const freeDeliveryLabel = getFreeDeliveryLabel(lang, getSettingValue(settings, "free_delivery_min_amount"));
  // Admin-editable shortcut links: a site path (/…) or https:// URL; anything else falls back to the default.
  const pillHref = (key: string, fallback: string) => {
    const v = getSettingValue(settings, key).trim();
    return v.startsWith("/") || /^https?:\/\//i.test(v) ? v : fallback;
  };
  const hstyle = parseHeroTextStyle(getSettingValue(settings, HERO_TEXT_STYLE_KEY));
  const promoAlt = heroTitleOverride || (lang === "bn" ? "প্রোমোশনাল ব্যানার" : "Promotional banner");

  // Only show tiles that have a real, non-zero number — "—"/0 tiles look unfinished.
  const tiles = [
    { label: lang === "bn" ? "অর্ডার" : "Orders", end: stats?.orders, icon: "📦" },
    { label: lang === "bn" ? "সেবা" : "Services", end: stats?.services, icon: "⚙️" },
    { label: lang === "bn" ? "গ্রাহক" : "Clients", end: stats?.clients, icon: "👥" },
    { label: lang === "bn" ? "প্রজেক্ট" : "Projects", end: stats?.projects, icon: "🚀" },
  ].filter((item) => typeof item.end === "number" && item.end > 0);

  /** One media card (admin promo media / mobile banner) for when no promo slide is live. */
  const mediaCard = (url: string, sizes: string, ratio = "aspect-[21/8]") => (
    <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-gradient-to-br from-brand-700 to-brand-900">
      {isVideoUrl(url) ? (
        <AutoVideo src={url} className={cn("w-full object-contain block", ratio)} tapToPlay aria-hidden />
      ) : (
        <div className={cn("relative w-full", ratio)}>
          {/* Whole banner visible (nothing cut); a blurred copy fills the side space. */}
          <Image src={url} alt="" aria-hidden fill sizes="200px" className="object-cover scale-110 blur-xl opacity-60" />
          <Image src={url} alt={promoAlt} fill sizes={sizes} className="object-contain" />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Mobile + tablet hero (<1024px): promo slider + search ── */}
      <section className="lg:hidden bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-900/20 dark:to-transparent">
        <div className="sr-only">
          <div role="heading" aria-level={1}>
            {heroTitleOverride || (lang === "bn"
              ? "সিলেটের দোকান, সেবা ও সফটওয়্যার টিম"
              : "Sylhet's store, service desk and software team.")}
            <span>
              {lang === "bn"
                ? "Sylhet's store, service desk and software team."
                : "সিলেটের দোকান, service desk and software team."}
            </span>
          </div>
          <p>
            {lang === "bn"
              ? "সারাদেশে নগদে ডেলিভারি"
              : "Cash on delivery across Bangladesh"}
          </p>
        </div>

        <div className="px-3 pt-2 md:px-6 md:pt-4 md:max-w-3xl md:mx-auto">
          {/* Low, wide banner (7:2 — half the old height). A dedicated mobile image from the admin wins;
              otherwise the promo slides are centre-cropped to the same low strip. */}
          {heroMobileImg ? (
            mediaCard(heroMobileImg, "(min-width: 768px) 720px, 100vw", "aspect-[7/2]")
          ) : (
            <PromoSlider
              placement="hero"
              aspect="aspect-[7/2]"
              fit="cover"
              minRatio={3.5}
              eagerFirstSlide
              initialSlides={initialHeroSlides}
              // ≥1024px this copy is hidden: "1px" makes the browser pick the
              // smallest candidate there instead of a full-width image.
              sizes="(min-width: 1024px) 1px, (min-width: 768px) 720px, 100vw"
              fallback={heroPromoMedia ? mediaCard(heroPromoMedia, "(min-width: 768px) 720px, 100vw", "aspect-[7/2]") : null}
            />
          )}
        </div>

        <div className="px-3 pt-2 pb-1 md:px-6 md:py-4 md:max-w-3xl md:mx-auto">
          <HomeSearchBar />
        </div>
      </section>

      {/* ── Desktop hero (≥1024px) — rich media layout ── */}
      <section
        className={cn(
          "hidden lg:flex gradient-hero relative overflow-hidden -mt-[var(--navbar-offset)] pt-[var(--navbar-height)]",
          heroVAlignClass(hstyle)
        )}
      >
        {/* The gradient-hero background doubles as the branded placeholder while the photo loads. */}
        {heroImage && !heroIsVideo && (
          <picture className="absolute inset-0 block">
            <source
              media="(min-width: 1024px)"
              srcSet={cloudinarySrcSet(heroImage, HERO_BG_WIDTHS) ?? heroImage}
              sizes="100vw"
            />
            {/* Decorative (alt=""): art-directed cover background; Cloudinary does the resizing. */}
            <img
              src={BLANK_IMG}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        )}
        {heroIsVideo && (
          <AutoVideo
            src={heroImage}
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden
          />
        )}
        {heroImage && <div className="absolute inset-0" style={{ background: HERO_TINT }} aria-hidden />}
        {/* Readability scrim — always on, so the headline stays legible over ANY
            admin photo (busy, bright or with its own baked-in text). Fades in
            below the navbar so the nav links keep their contrast. */}
        <div
          className="absolute inset-x-0 bottom-0 top-[var(--navbar-offset)] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(12,17,38,0.86) 0%, rgba(12,17,38,0.66) 40%, rgba(12,17,38,0.30) 70%, rgba(12,17,38,0.18) 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 90px)",
            maskImage: "linear-gradient(to bottom, transparent 0, #000 90px)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-20 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 xl:px-6 pt-3 pb-20 xl:pt-4 relative z-10">
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:grid-cols-[minmax(0,42rem)_minmax(0,34rem)] xl:justify-center gap-8 xl:gap-10 items-center">
            <div className="text-white flex flex-col gap-4 animate-slide-up [text-shadow:0_2px_14px_rgba(0,0,0,0.35)]">
              <div className={cn("relative z-10 flex flex-col gap-4", heroAlignClass(hstyle))}>
                <div className="flex flex-wrap items-center gap-2 [text-shadow:none]">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-black/35 backdrop-blur-md border border-white/20">
                    <Zap className="w-3.5 h-3.5 text-yellow-300" aria-hidden />
                    {t("hero_badge")}
                  </div>
                  {freeDeliveryLabel && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600/90 backdrop-blur-sm text-white border border-green-300/40 shadow-sm">
                      🚚 {freeDeliveryLabel}
                    </span>
                  )}
                </div>

                <h1
                  className={cn("leading-tight text-balance", heroTitleClass(hstyle))}
                  style={hstyle.titleColor ? { color: hstyle.titleColor } : undefined}
                >
                  {heroTitleOverride ? (
                    <span>{heroTitleOverride}</span>
                  ) : (
                    <>
                      <span className="block text-yellow-300 font-extrabold tracking-[0.06em] sm:tracking-[0.08em] drop-shadow-sm">
                        {t("hero_brand")}
                      </span>
                      <span className="block mt-3 text-white font-bold leading-snug">
                        {t("hero_tagline")}
                      </span>
                    </>
                  )}
                </h1>

                <p
                  className={cn("max-w-xl leading-relaxed", heroSubClass(hstyle), !hstyle.subColor && "text-white/90")}
                  style={hstyle.subColor ? { color: hstyle.subColor } : undefined}
                >
                  {heroSubtitle}
                </p>

                <p className={cn("text-white/80 max-w-xl leading-relaxed", heroNoteClass(hstyle))}>
                  {lang === "bn"
                    ? getSettingValue(settings, "hero_note_bn") || ABO_ACRONYM.bn
                    : getSettingValue(settings, "hero_note_en") || ABO_ACRONYM.en}
                </p>

                <div className="flex flex-row gap-3 pt-2 w-full max-w-2xl [text-shadow:none]">
                  <Link href="/services" className="btn btn-lg btn-primary btn-ripple flex-1 justify-center min-w-0 px-8 text-lg !min-h-12 !h-12">
                    <Calendar className="w-5 h-5 flex-none" aria-hidden />
                    <span className="truncate">{t("hero_cta_services")}</span>
                    <ArrowRight className="w-4 h-4 flex-none" aria-hidden />
                  </Link>
                  <Link href={heroCtaUrl.startsWith("/") ? heroCtaUrl : "/products"} className="btn btn-lg btn-outline !border-white/80 !bg-white/15 backdrop-blur-sm !text-white font-semibold hover:!bg-white/25 btn-ripple flex-1 justify-center min-w-0 px-8 text-lg !min-h-12 !h-12">
                    <ShoppingBag className="w-5 h-5 flex-none" aria-hidden />
                    <span className="truncate">{heroCtaText || t("hero_cta_products")}</span>
                  </Link>
                </div>

                {/* What ABO is, at a glance: three things you can do + live trust numbers (compact, left side). */}
                <div className="flex flex-col gap-3 pt-1 w-full max-w-xl [text-shadow:none]">
                  <div className="flex flex-wrap items-center gap-2" role="list" aria-label={lang === "bn" ? "আমরা যা করি" : "What we do"}>
                    {[
                      { href: pillHref("hero_pill1_url", "/products"), icon: "🛍️", bn: getSettingValue(settings, "hero_pill1_bn") || "পণ্য কিনুন", en: getSettingValue(settings, "hero_pill1_en") || "Shop products" },
                      { href: pillHref("hero_pill2_url", "/services"), icon: "🛠️", bn: getSettingValue(settings, "hero_pill2_bn") || "সেবা নিন", en: getSettingValue(settings, "hero_pill2_en") || "Book services" },
                      { href: pillHref("hero_pill3_url", "/services/software"), icon: "💻", bn: getSettingValue(settings, "hero_pill3_bn") || "সফটওয়্যার ও AI", en: getSettingValue(settings, "hero_pill3_en") || "Software & AI" },
                    ].map((x) => (
                      <Link key={x.href} href={x.href} role="listitem" className={cn("inline-flex items-center rounded-full bg-gradient-to-b from-white/25 to-white/[0.06] hover:from-white/35 hover:to-white/15 border border-white/30 shadow-lg shadow-black/20 backdrop-blur-md font-bold text-white transition hover:-translate-y-0.5", heroPillClass(hstyle))}>
                        <span aria-hidden>{x.icon}</span>{lang === "bn" ? x.bn : x.en}
                      </Link>
                    ))}
                  </div>
                  <div className="flex items-center gap-2.5 min-h-[44px]">
                    {statsLoading && tiles.length === 0 ? (
                      // Same height as the real numbers, so nothing jumps when they arrive.
                      <div className="flex gap-2" aria-hidden>{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 w-[84px] rounded-xl bg-white/10 animate-pulse" />)}</div>
                    ) : tiles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tiles.map((item) => (
                          <div key={item.label} className="flex items-center gap-2 rounded-xl bg-[#0c1330]/70 backdrop-blur-md border border-white/15 px-3 h-11">
                            <span className="text-base leading-none" aria-hidden>{item.icon}</span>
                            <span className="leading-tight">
                              <b className="block text-white text-sm tabular-nums"><AnimatedCounter end={item.end as number} />+</b>
                              <span className="block text-white/75 text-[10px]">{item.label}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end xl:justify-start animate-fade-in">
              <div className="relative w-full max-w-[30rem] xl:max-w-[34rem] flex flex-col gap-4">
                <PromoSlider
                  placement="hero"
                  aspect="aspect-[4/3]"
                  eagerFirstSlide
                  initialSlides={initialHeroSlides}
                  // Hidden below 1024px: "1px" keeps phones from fetching this copy at full size.
                  sizes="(max-width: 1023px) 1px, 512px"
                  fallback={heroPromoMedia ? mediaCard(heroPromoMedia, "512px") : null}
                />

              </div>
            </div>
          </div>
        </div>

      </section>
    </>
  );
}
