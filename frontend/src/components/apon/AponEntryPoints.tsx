"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, Smartphone } from "lucide-react";
import { useAponInfo } from "@/hooks/useAponInfo";
import { useLanguageStore } from "@/store/language";
import { getSettingValue } from "@/lib/settingValue";
import { aponText, DEFAULT_NAME, DEFAULT_TAGLINE } from "@/lib/apon";

/**
 * Small, self-hiding doors to the /apon page. Each one renders nothing unless the admin has
 * turned the app on, a build is published, and that particular spot is enabled.
 */

/** Desktop navbar (wide screens only, so the menu never gets crowded). */
export function AponNavButton() {
  const { visible } = useAponInfo();
  const { lang } = useLanguageStore();
  if (!visible("nav")) return null;
  const bn = lang === "bn";
  return (
    <Link
      href="/apon"
      title={bn ? "আপন অ্যাপ ডাউনলোড করুন" : "Get the Apon app"}
      aria-label={bn ? "আপন অ্যাপ ডাউনলোড করুন" : "Get the Apon app"}
      className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-brand-200 dark:border-white/20 px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-200 hover:bg-brand-50 dark:hover:bg-white/10 transition-colors"
    >
      <Smartphone className="w-4 h-4" aria-hidden />
      <span>{bn ? "অ্যাপ" : "App"}</span>
    </Link>
  );
}

/** Row used inside the mobile "More" drawer. */
export function useAponDrawerRow() {
  const { visible } = useAponInfo();
  return visible("drawer")
    ? { href: "/apon", icon: Smartphone, label: { en: "Get the Apon app", bn: "আপন অ্যাপ ডাউনলোড" }, meta: { en: "free · Android", bn: "ফ্রি · Android" } }
    : null;
}

/** Slim promo band for the homepage. */
export function AponHomeBand() {
  const { visible, settings } = useAponInfo();
  const { lang } = useLanguageStore();
  if (!visible("home")) return null;
  const bn = lang === "bn";
  const name = aponText(settings, "apon_name", DEFAULT_NAME, bn);
  const tagline = aponText(settings, "apon_tagline", DEFAULT_TAGLINE, bn);
  const icon = getSettingValue(settings, "apon_icon_url").trim() || "/apon/icon-192.png";
  return (
    <section className="py-4 sm:py-6" aria-label={bn ? "আপন অ্যাপ" : "Apon app"}>
      <div className="container mx-auto px-4">
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white grid grid-cols-[3rem_minmax(0,1fr)] sm:flex sm:flex-row items-center gap-x-3 gap-y-3 sm:gap-6 shadow-lg"
          style={{ background: "linear-gradient(120deg,#0A3C85 0%,#0b3270 60%,#14182b 100%)" }}
        >
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#F2C14E]/15 blur-2xl pointer-events-none" aria-hidden />
          <Image src={icon} alt="" width={72} height={72} unoptimized className="relative h-12 w-12 sm:h-[4.5rem] sm:w-[4.5rem] rounded-xl sm:rounded-2xl ring-1 ring-white/25 shadow-xl" />
          <div className="relative flex-1 text-left min-w-0">
            <p className="text-base sm:text-xl font-extrabold leading-tight">
              {name} {bn ? "অ্যাপ" : "App"} <span className="ml-1 align-middle rounded-full bg-[#F2C14E] px-2 py-0.5 text-[11px] font-bold text-[#0A3C85]">{bn ? "ফ্রি" : "FREE"}</span>
            </p>
            <p className="mt-1 text-xs sm:text-sm text-white/85 text-balance line-clamp-2">{tagline}</p>
          </div>
          <div className="relative col-span-2 flex flex-row gap-2 w-full sm:w-auto sm:col-span-1">
            <Link href="/apon#download" className="btn btn-primary btn-md flex-1 sm:flex-none justify-center gap-2 text-sm">
              <Download className="w-4 h-4" aria-hidden /> {bn ? "ডাউনলোড" : "Download"}
            </Link>
            <Link href="/apon" className="btn btn-md flex-1 sm:flex-none justify-center gap-2 border border-white/40 text-white hover:bg-white/10 text-sm">
              {bn ? "বিস্তারিত" : "Details"} <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Badge shown next to the store badges in the footer. */
export function AponFooterBadge() {
  const { visible } = useAponInfo();
  const { lang } = useLanguageStore();
  if (!visible("footer")) return null;
  const bn = lang === "bn";
  return (
    <Link href="/apon" className="flex-1 flex items-center gap-2 min-h-[44px] rounded-xl bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/10 transition-colors px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400">
      <Smartphone className="w-5 h-5 flex-shrink-0 text-[#F2C14E]" aria-hidden />
      <span className="text-left leading-tight">
        <span className="block text-[8px] uppercase tracking-wide text-white/80">{bn ? "ডাউনলোড করুন" : "Download"}</span>
        <span className="block text-[12px] font-extrabold text-white">{bn ? "আপন · Android" : "Apon · Android"}</span>
      </span>
    </Link>
  );
}

/** True when the footer should show its "Download our app" block because of Apon alone. */
export function useAponFooterVisible(): boolean {
  return useAponInfo().visible("footer");
}
