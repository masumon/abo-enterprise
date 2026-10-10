"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { publicApi } from "@/lib/api";
import { ABO_ACRONYM, getBrandName, getBrandTagline } from "@/lib/tokens";
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
  heroAlignClass,
  heroVAlignClass,
} from "@/lib/heroTextStyle";
import BrandLogo from "@/components/ui/BrandLogo";
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
  const { settings } = usePublicSettings(["hero_image_url", "hero_mobile_image_url", "hero_promo_media_url", "hero_title_en", "hero_title_bn", "hero_subtitle_en", "hero_subtitle_bn", "hero_cta_text", "hero_cta_url", "free_delivery_min_amount", HERO_TEXT_STYLE_KEY]);
  const { stats } = usePublicStats();
  const [activity, setActivity] = useState<ActivityItem[]>([]);

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
  const hstyle = parseHeroTextStyle(getSettingValue(settings, HERO_TEXT_STYLE_KEY));
  const promoAlt = heroTitleOverride || (lang === "bn" ? "প্রোমোশনাল ব্যানার" : "Promotional banner");
  // Mobile/tablet card when no promo slide is live: promo media first, then the mobile banner.
  const mobileFallbackMedia = heroPromoMedia || heroMobileImg;

  useEffect(() => {
    publicApi.activity().then((r) => {
      const items = r.data.data;
      if (items?.length) setActivity(items);
    }).catch(() => {});
  }, []);

  // Only show tiles that have a real, non-zero number — "—"/0 tiles look unfinished.
  const tiles = [
    { label: lang === "bn" ? "অর্ডার" : "Orders", end: stats?.orders, icon: "📦" },
    { label: lang === "bn" ? "সেবা" : "Services", end: stats?.services, icon: "⚙️" },
    { label: lang === "bn" ? "গ্রাহক" : "Clients", end: stats?.clients, icon: "👥" },
    { label: lang === "bn" ? "প্রজেক্ট" : "Projects", end: stats?.projects, icon: "🚀" },
  ].filter((item) => typeof item.end === "number" && item.end > 0);
  // Three rows keep the card short enough to sit under the promo card on a
  // laptop screen without running into the bottom of the hero.
  const recent = activity.slice(0, 3);

  /** One media card (admin promo media / mobile banner) for when no promo slide is live. */
  const mediaCard = (url: string, sizes: string) => (
    <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-gradient-to-br from-brand-700 to-brand-900">
      {isVideoUrl(url) ? (
        <AutoVideo src={url} className="w-full aspect-video object-cover block" tapToPlay aria-hidden />
      ) : (
        <div className="relative w-full aspect-video">
          <Image src={url} alt={promoAlt} fill sizes={sizes} className="object-cover" />
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
          <PromoSlider
            placement="hero"
            aspect="aspect-video"
            eagerFirstSlide
            initialSlides={initialHeroSlides}
            // ≥1024px this copy is hidden: "1px" makes the browser pick the
            // smallest candidate there instead of a full-width image.
            sizes="(min-width: 1024px) 1px, (min-width: 768px) 720px, 100vw"
            fallback={mobileFallbackMedia ? mediaCard(mobileFallbackMedia, "(min-width: 768px) 720px, 100vw") : null}
          />
        </div>

        <div className="px-3 pt-2 pb-1 md:px-6 md:py-4 md:max-w-3xl md:mx-auto">
          <HomeSearchBar />
        </div>
      </section>

      {/* ── Desktop hero (≥1024px) — rich media layout ── */}
      <section
        className={cn(
          "hidden lg:flex gradient-hero min-h-[92vh] min-h-[92dvh] relative overflow-hidden -mt-[var(--navbar-offset)] pt-[var(--navbar-height)]",
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

        <div className="container mx-auto px-4 xl:px-6 pt-8 pb-20 xl:pt-12 relative z-10">
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-10 xl:gap-16 items-center">
            <div className="text-white flex flex-col gap-6 animate-slide-up [text-shadow:0_2px_14px_rgba(0,0,0,0.35)]">
              <div className={cn("relative z-10 flex flex-col gap-6", heroAlignClass(hstyle))}>
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
                  className={cn("max-w-lg leading-relaxed", heroSubClass(hstyle), !hstyle.subColor && "text-white/90")}
                  style={hstyle.subColor ? { color: hstyle.subColor } : undefined}
                >
                  {heroSubtitle}
                </p>

                <p className="text-white/75 text-xs max-w-lg">
                  {lang === "bn" ? ABO_ACRONYM.bn : ABO_ACRONYM.en}
                </p>

                <div className="flex flex-row gap-3 pt-2 w-full max-w-xl [text-shadow:none]">
                  <Link href="/services" className="btn btn-lg btn-primary btn-ripple flex-1 justify-center min-w-0 px-6 text-base">
                    <Calendar className="w-5 h-5 flex-none" aria-hidden />
                    <span className="truncate">{t("hero_cta_services")}</span>
                    <ArrowRight className="w-4 h-4 flex-none" aria-hidden />
                  </Link>
                  <Link href={heroCtaUrl.startsWith("/") ? heroCtaUrl : "/products"} className="btn btn-lg btn-outline !border-white/50 !bg-black/20 backdrop-blur-sm !text-white hover:!bg-white/10 btn-ripple flex-1 justify-center min-w-0 px-6 text-base">
                    <ShoppingBag className="w-5 h-5 flex-none" aria-hidden />
                    <span className="truncate">{heroCtaText || t("hero_cta_products")}</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex justify-end animate-fade-in">
              <div className="relative w-full max-w-[26rem] xl:max-w-md flex flex-col gap-4">
                <PromoSlider
                  placement="hero"
                  eagerFirstSlide
                  initialSlides={initialHeroSlides}
                  // Hidden below 1024px: "1px" keeps phones from fetching this copy at full size.
                  sizes="(max-width: 1023px) 1px, 448px"
                  fallback={heroPromoMedia ? mediaCard(heroPromoMedia, "448px") : null}
                />

                {(tiles.length > 0 || recent.length > 0) && (
                  // Solid dark glass: readable over any background photo.
                  <div className="rounded-3xl p-4 xl:p-5 bg-[#0c1330]/85 backdrop-blur-xl border border-white/15 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <BrandLogo size="sm" href={false} variant="glass" />
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{getBrandName(lang)}</p>
                        <p className="text-white/75 text-[11px] truncate">{getBrandTagline(lang)}</p>
                      </div>
                    </div>

                    {tiles.length > 0 && (
                      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
                        {tiles.map((item) => (
                          <div key={item.label} className="rounded-xl bg-white/[0.08] border border-white/10 px-2 py-2.5 text-center animate-scale-in">
                            <span className="text-base leading-none" aria-hidden>{item.icon}</span>
                            <p className="text-white font-bold text-base mt-1 tabular-nums">
                              <AnimatedCounter end={item.end as number} />
                            </p>
                            <p className="text-white/80 text-[11px] truncate">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {recent.length > 0 && (
                      // Hidden on short laptop screens so the card never runs into the wave.
                      <div className={cn("space-y-1 [@media(max-height:780px)]:hidden", tiles.length > 0 && "mt-3")}>
                        <p className="text-white/75 text-[11px] font-semibold uppercase tracking-wider">
                          {lang === "bn" ? "সাম্প্রতিক কার্যক্রম" : "Recent Activity"}
                        </p>
                        {recent.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-white/10 last:border-0">
                            <span aria-hidden>{item.icon}</span>
                            <span className="text-xs flex-1 min-w-0 truncate text-white/90">
                              {maskPublicRefs(lang === "bn" ? item.text_bn : item.text_en)}
                            </span>
                            <span className="text-white/65 text-[10px] flex-none">{item.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0" aria-hidden>
          <svg viewBox="0 0 1440 60" fill="none" className="w-full">
            <path d="M0 60L48 52C96 44 192 28 288 24C384 20 480 28 576 36C672 44 768 52 864 48C960 44 1056 28 1152 24C1248 20 1344 28 1392 32L1440 36V60H0Z" fill="var(--surface, #fafbff)"/>
          </svg>
        </div>
      </section>
    </>
  );
}
