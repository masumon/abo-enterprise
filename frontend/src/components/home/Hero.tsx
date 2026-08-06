"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ShoppingBag, ArrowRight, Zap } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { useT } from "@/lib/i18n/useT";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { publicApi } from "@/lib/api";
import { ABO_ACRONYM, getBrandName, getBrandTagline } from "@/lib/tokens";
import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { MARKETING_STATS } from "@/lib/siteDefaults";
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

interface ActivityItem {
  icon: string;
  text_en: string;
  text_bn: string;
  time: string;
}

interface StatsData {
  orders: number;
  services: number;
  clients: number;
  projects: number;
}

const FALLBACK_STATS: StatsData = {
  orders: MARKETING_STATS.orders,
  services: MARKETING_STATS.services,
  clients: MARKETING_STATS.clients,
  projects: MARKETING_STATS.projects,
};
const FALLBACK_ACTIVITY: ActivityItem[] = [
  { icon: "🛒", text_en: "New order received", text_bn: "নতুন অর্ডার", time: "—" },
  { icon: "📅", text_en: "Booking confirmed", text_bn: "বুকিং নিশ্চিত", time: "—" },
];

function displayStat(actual: number, floor: number): number {
  return actual > 0 ? actual : floor;
}

export default function Hero() {
  const { lang } = useLanguageStore();
  const t = useT();
  const { settings } = usePublicSettings(["hero_image_url", "hero_mobile_image_url", "hero_promo_media_url", "hero_title_en", "hero_title_bn", "hero_subtitle_en", "hero_subtitle_bn", "hero_cta_text", "hero_cta_url", "free_delivery_min_amount", HERO_TEXT_STYLE_KEY]);
  const [stats, setStats] = useState<StatsData>(FALLBACK_STATS);
  const [activity, setActivity] = useState<ActivityItem[]>(FALLBACK_ACTIVITY);

  const heroImage = resolveHomeBannerImage(settings);
  const heroIsVideo = isVideoUrl(heroImage);
  const heroMobileImg = getSettingValue(settings, "hero_mobile_image_url");
  const heroMobileIsVideo = isVideoUrl(heroMobileImg);
  const heroPromoMedia = getSettingValue(settings, "hero_promo_media_url");
  const heroPromo = heroPromoMedia || heroImage;
  const heroPromoIsVideo = isVideoUrl(heroPromo);
  const heroTitleOverride = lang === "bn"
    ? getSettingValue(settings, "hero_title_bn")
    : getSettingValue(settings, "hero_title_en");
  const heroSubtitle = lang === "bn"
    ? getSettingValue(settings, "hero_subtitle_bn") || t("hero_sub")
    : getSettingValue(settings, "hero_subtitle_en") || t("hero_sub");
  const heroCtaText = getSettingValue(settings, "hero_cta_text");
  const heroCtaUrl = getSettingValue(settings, "hero_cta_url", "/products");
  const hstyle = parseHeroTextStyle(getSettingValue(settings, HERO_TEXT_STYLE_KEY));

  useEffect(() => {
    publicApi.stats().then((r) => {
      const d = r.data.data;
      if (d) setStats({
        orders: displayStat(d.orders ?? 0, MARKETING_STATS.orders),
        services: displayStat(d.services ?? 0, MARKETING_STATS.services),
        clients: displayStat(d.clients ?? 0, MARKETING_STATS.clients),
        projects: displayStat(d.projects ?? 0, MARKETING_STATS.projects),
      });
    }).catch(() => {});
    publicApi.activity().then((r) => {
      const items = r.data.data;
      if (items?.length) setActivity(items);
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* ── Mobile hero — matches artifact Screen 04 ── */}
      <section className="lg:hidden bg-gradient-to-b from-brand-50 to-transparent dark:from-brand-900/20 dark:to-transparent">
        {/* Kept in the DOM for the page's one true <h1> (SEO/a11y) but not
            shown visually — the redesigned mobile hero leads with the promo
            banner + search bar instead of a text headline. Admin-controlled
            hero_title/hero_subtitle fields are untouched. */}
        <div className="sr-only">
          <h1>
            {heroTitleOverride || (lang === "bn"
              ? "সিলেটের দোকান, সেবা ও সফটওয়্যার টিম"
              : "Sylhet's store, service desk and software team.")}
            <span>
              {heroTitleOverride
                ? (lang === "bn"
                    ? "Sylhet's store, service desk and software team."
                    : "সিলেটের দোকান, সেবা ও সফটওয়্যার টিম")
                : (lang === "bn"
                    ? "Sylhet's store, service desk and software team."
                    : "সিলেটের দোকান, সেবা ও সফটওয়্যার টিম")}
            </span>
          </h1>
          <p>
            {lang === "bn"
              ? "সারাদেশে নগদে ডেলিভারি · ২০১৭ সাল থেকে"
              : "Cash on delivery across Bangladesh · Since 2017"}
          </p>
        </div>

        {/* Admin-managed promo carousel (Admin → Promo Slides, placement "hero").
            Renders nothing when no slide is configured — the wide desktop
            background image isn't shaped for a small mobile card crop, so we
            don't force it here. */}
        <div className="px-3 pt-2">
          <PromoSlider placement="hero" aspect="aspect-video" eagerFirstSlide />
        </div>

        <div className="px-3 py-2">
          <HomeSearchBar />
        </div>
      </section>

      {/* ── Desktop hero — rich media layout ── */}
      <section
        className={cn(
          "hidden lg:flex gradient-hero min-h-[92vh] min-h-[92dvh] relative overflow-hidden -mt-[var(--navbar-offset)] pt-[var(--navbar-height)]",
          heroVAlignClass(hstyle)
        )}
      >
        {heroImage && !heroIsVideo && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(53,71,155,0.25) 0%, rgba(30,43,107,0.20) 50%, rgba(228,161,27,0.15) 100%), url(${heroImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
        )}
        {heroIsVideo && (
          <>
            <AutoVideo
              src={heroImage}
              className="absolute inset-0 w-full h-full object-cover"
              aria-hidden
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, rgba(53,71,155,0.25) 0%, rgba(30,43,107,0.20) 50%, rgba(228,161,27,0.15) 100%)" }}
              aria-hidden
            />
          </>
        )}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white flex flex-col gap-6 animate-slide-up">
              <div className={cn("relative z-10 flex flex-col gap-6", heroAlignClass(hstyle))}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 glass-panel rounded-full text-sm font-medium">
                    <Zap className="w-3.5 h-3.5 text-yellow-300" aria-hidden />
                    {t("hero_badge")}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600/80 backdrop-blur-sm text-white border border-green-300/40 shadow-sm">
                    🚚 {lang === "bn" ? `সিলেটে ফ্রি ডেলিভারি ৳${getSettingValue(settings, "free_delivery_min_amount") || "2000"}+` : `Free Sylhet delivery ৳${getSettingValue(settings, "free_delivery_min_amount") || "2000"}+`}
                  </span>
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
                  className={cn("max-w-lg leading-relaxed", heroSubClass(hstyle), !hstyle.subColor && "text-white/80")}
                  style={hstyle.subColor ? { color: hstyle.subColor } : undefined}
                >
                  {heroSubtitle}
                </p>

                <p className="text-white/60 text-xs max-w-lg">
                  {lang === "bn" ? ABO_ACRONYM.bn : ABO_ACRONYM.en}
                </p>

                <div className="flex flex-row gap-3 pt-2 w-full">
                  <Link href="/services" className="btn btn-lg btn-primary btn-ripple flex-1 justify-center min-w-0 px-6 text-base">
                    <Calendar className="w-5 h-5 flex-none" aria-hidden />
                    <span className="truncate">{t("hero_cta_services")}</span>
                    <ArrowRight className="w-4 h-4 flex-none" aria-hidden />
                  </Link>
                  <Link href={heroCtaUrl.startsWith("/") ? heroCtaUrl : "/products"} className="btn btn-lg btn-outline border-white/40 text-white hover:bg-white/10 btn-ripple flex-1 justify-center min-w-0 px-6 text-base">
                    <ShoppingBag className="w-5 h-5 flex-none" aria-hidden />
                    <span className="truncate">{heroCtaText || t("hero_cta_products")}</span>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center animate-fade-in">
              <div className="relative w-full max-w-md space-y-4">
                <PromoSlider
                  placement="hero"
                  fallback={
                    heroPromoMedia ? (
                      <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-black/20">
                        {heroPromoIsVideo ? (
                          <AutoVideo src={heroPromoMedia} className="w-full aspect-video object-cover block" tapToPlay aria-hidden />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={heroPromoMedia}
                            alt={heroTitleOverride || (lang === "bn" ? "প্রোমোশনাল ব্যানার" : "Promotional banner")}
                            className="w-full aspect-video object-cover block"
                          />
                        )}
                      </div>
                    ) : null
                  }
                />
                <div className="glass-panel rounded-3xl p-6 shadow-2xl border border-white/20">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <BrandLogo size="md" href={false} variant="glass" />
                      <div>
                        <p className="text-white font-semibold text-sm">{getBrandName(lang)}</p>
                        <p className="text-white/70 text-[11px]">{getBrandTagline(lang)}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-green-300 font-medium bg-green-500/20 px-2.5 py-1 rounded-full border border-green-500/30">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" aria-hidden />
                      Live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: lang === "bn" ? "অর্ডার" : "Orders", end: stats.orders, suffix: "+", icon: "📦" },
                      { label: lang === "bn" ? "সেবা" : "Services", end: stats.services, suffix: "+", icon: "⚙️" },
                      { label: lang === "bn" ? "গ্রাহক" : "Clients", end: stats.clients, suffix: "+", icon: "👥" },
                      { label: lang === "bn" ? "প্রজেক্ট" : "Projects", end: stats.projects, suffix: "+", icon: "🚀" },
                    ].map((item) => (
                      <div key={item.label} className="glass-panel rounded-xl p-3.5 animate-scale-in">
                        <span className="text-xl" aria-hidden>{item.icon}</span>
                        <p className="text-white font-bold text-lg mt-1">
                          <AnimatedCounter end={item.end} suffix={item.suffix} />
                        </p>
                        <p className="text-white/60 text-xs">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">
                      {lang === "bn" ? "সাম্প্রতিক কার্যক্রম" : "Recent Activity"}
                    </p>
                    {activity.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                        <span aria-hidden>{item.icon}</span>
                        <span className="text-xs flex-1 text-white/80">
                          {lang === "bn" ? item.text_bn : item.text_en}
                        </span>
                        <span className="text-white/40 text-[10px]">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
