"use client";

import { Monitor, Tablet, Smartphone, Info } from "lucide-react";
import LivePreview from "@/components/admin/LivePreview";
import AutoVideo from "@/components/ui/AutoVideo";
import { isVideoUrl } from "@/lib/media";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";

/** Which website surface an uploaded banner image feeds. */
export type BannerKind = "page-banner" | "hero-desktop" | "hero-mobile" | "hero-promo";

type Device = "desktop" | "tablet" | "mobile";

interface GuideText {
  sizes: { device: Device; bn: string; en: string }[];
  safeBn: string[];
  safeEn: string[];
}

/** Recommended sizes + "safe zone" rules per surface (Bangla first). Mirrors
 * how PageHero / the homepage Hero actually crop and overlay the image. */
const GUIDES: Record<BannerKind, GuideText> = {
  "page-banner": {
    sizes: [
      { device: "desktop", bn: "ডেস্কটপ: ১৯২০×৬০০ px (চওড়া, প্রায় ৩:১)", en: "Desktop: 1920×600 px (wide, ~3:1)" },
      { device: "tablet", bn: "ট্যাবলেট: একই ছবি ১২৮০×৫০০ অনুপাতে মাঝখান থেকে কাটা হয়", en: "Tablet: same image, centre-cropped to 1280×500" },
      { device: "mobile", bn: "মোবাইল: মাঝখান থেকে ৭৬৮×৪২০ অংশ দেখায়", en: "Mobile: centre 768×420 area is shown" },
    ],
    safeBn: [
      "পেজের শিরোনাম বাম দিকে বসে — বাম ও মাঝের অংশে ছবির ভেতরে লেখা/লোগো দেবেন না।",
      "জরুরি জিনিস (পণ্য, মুখ) ছবির মাঝখানে বা ডান দিকে রাখুন।",
      "ট্যাবলেট ও মোবাইলে ছবিটি একটু ঝাপসা ও গাঢ় করে দেখানো হয়, যাতে শিরোনাম সবসময় পড়া যায়।",
    ],
    safeEn: [
      "The page title sits on the left — don't put text/logos in the left or middle of the image.",
      "Keep important things (product, faces) in the centre or right.",
      "On tablet and mobile the image is softly blurred and darkened so the title always reads.",
    ],
  },
  "hero-desktop": {
    sizes: [
      { device: "desktop", bn: "ডেস্কটপ: ১৯২০×১০৮০ px (১৬:৯) — শুধু বড় স্ক্রিনে (১০২৪px+) দেখায়", en: "Desktop: 1920×1080 px (16:9) — large screens only (1024px+)" },
      { device: "tablet", bn: "ট্যাবলেট/মোবাইলে এই ছবি দেখায় না — সেখানে প্রোমো স্লাইড দেখায়", en: "Not shown on tablet/mobile — the promo slider is shown there" },
    ],
    safeBn: [
      "বাম অর্ধেকে হিরো শিরোনাম ও বাটন বসে এবং সেখানে গাঢ় ছায়া পড়ে — ছবির লেখা বাম দিকে দেবেন না।",
      "ডান দিকে প্রোমো কার্ড ও পরিসংখ্যান কার্ড বসে — ছবির মূল বিষয় মাঝের দিকে রাখুন।",
      "শান্ত/কম ব্যস্ত ছবি সবচেয়ে ভালো দেখায়।",
    ],
    safeEn: [
      "The hero title and buttons sit on the darkened left half — no text in the image there.",
      "The promo card and stats card sit on the right — keep the subject towards the centre.",
      "Calm, uncluttered photos look best.",
    ],
  },
  "hero-mobile": {
    sizes: [
      { device: "mobile", bn: "মোবাইল/ট্যাবলেট কার্ড: ১২৮০×৭২০ px (১৬:৯)", en: "Mobile/tablet card: 1280×720 px (16:9)" },
    ],
    safeBn: [
      "কোনো প্রোমো স্লাইড চালু না থাকলে মোবাইল ও ট্যাবলেটে হোমপেজের উপরে এই কার্ড দেখায়।",
      "পুরো ছবিটাই দেখা যায় — লেখা থাকলে বড় ও চারপাশে একটু ফাঁকা রেখে দিন।",
    ],
    safeEn: [
      "Shown at the top of the homepage on mobile & tablet when no promo slide is live.",
      "The whole image is visible — if it has text, make it large with some margin around it.",
    ],
  },
  "hero-promo": {
    sizes: [
      { device: "desktop", bn: "কার্ড: ১২৮০×৭২০ px (১৬:৯) · ছবি, GIF বা MP4", en: "Card: 1280×720 px (16:9) · image, GIF or MP4" },
    ],
    safeBn: [
      "ডেস্কটপে হিরোর ডান দিকে কার্ড হিসেবে বসে; প্রোমো স্লাইড চালু থাকলে স্লাইডই আগে দেখায়।",
      "চারপাশে প্রায় ৫% জায়গা ফাঁকা রাখুন — কোণাগুলো গোল করে কাটা হয়।",
    ],
    safeEn: [
      "Sits as a card on the right of the desktop hero; live promo slides take priority.",
      "Leave ~5% margin around the edges — corners are rounded.",
    ],
  },
};

const DEVICE_ICON = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };

/** Bangla-first upload guidance: sizes per device + safe-zone rules + speed tip. */
export function BannerGuide({ kind }: { kind: BannerKind }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  const g = GUIDES[kind];
  return (
    <div className="mt-3 rounded-xl border border-brand-100 dark:border-white/10 bg-brand-50/60 dark:bg-white/[0.03] p-3 text-xs text-gray-700 dark:text-gray-300 space-y-2">
      <p className="font-semibold text-brand-800 dark:text-brand-200 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" aria-hidden />
        {bn ? "কোন মাপের ছবি দেবেন" : "What size to upload"}
      </p>
      <ul className="space-y-1">
        {g.sizes.map((s) => {
          const Icon = DEVICE_ICON[s.device];
          return (
            <li key={s.device + s.en} className="flex items-start gap-1.5">
              <Icon className="w-3.5 h-3.5 mt-0.5 flex-none text-brand-500" aria-hidden />
              <span>{bn ? s.bn : s.en}</span>
            </li>
          );
        })}
      </ul>
      <p className="font-semibold text-brand-800 dark:text-brand-200 pt-1">{bn ? "নিরাপদ জায়গা (Safe zone)" : "Safe zone"}</p>
      <ul className="list-disc pl-4 space-y-0.5">
        {(bn ? g.safeBn : g.safeEn).map((line) => <li key={line}>{line}</li>)}
      </ul>
      <p className="text-gray-500 dark:text-gray-400">
        {bn
          ? "ফাইল: JPG/WebP (ছবি), MP4 (ভিডিও)। দ্রুত লোডের জন্য ছবি ১MB-এর কম রাখুন — ওয়েবসাইট নিজে থেকেই প্রতিটি স্ক্রিনের মাপে ছোট করে দেয়।"
          : "Files: JPG/WebP (image), MP4 (video). Keep images under 1 MB for speed — the site resizes them for every screen automatically."}
      </p>
    </div>
  );
}

/** Scrims identical to the live components, so the preview is honest. */
const PAGE_DESKTOP_SCRIM = "linear-gradient(90deg, rgba(10,22,40,0.80) 0%, rgba(10,22,40,0.58) 50%, rgba(10,22,40,0.22) 100%)";
const PAGE_BASE_SCRIM = "linear-gradient(135deg, rgba(10,22,40,0.56) 0%, rgba(53,71,155,0.48) 48%, rgba(30,43,107,0.54) 100%)";
const DESKTOP_BLUR_MASK = "linear-gradient(90deg, #000 0%, #000 50%, transparent 80%)";
const HERO_SCRIM = "linear-gradient(90deg, rgba(12,17,38,0.86) 0%, rgba(12,17,38,0.66) 40%, rgba(12,17,38,0.30) 70%, rgba(12,17,38,0.18) 100%)";

function Media({ url, className }: { url: string; className?: string }) {
  if (isVideoUrl(url)) return <AutoVideo src={url} className={className} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary uploaded URL
  return <img src={url} alt="" className={className} />;
}

function Frame({ device, label, aspect, children }: { device: Device; label: string; aspect: string; children: React.ReactNode }) {
  const Icon = DEVICE_ICON[device];
  return (
    <figure className="min-w-0">
      <figcaption className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
        <Icon className="w-3.5 h-3.5" aria-hidden /> {label}
      </figcaption>
      <div className={cn("relative w-full overflow-hidden rounded-lg border-4 border-gray-800 dark:border-gray-600 bg-gradient-to-br from-brand-700 to-brand-950 shadow", aspect)}>
        {children}
      </div>
    </figure>
  );
}

/** Dashed box marking where the live site draws its title — keep image text out of it. */
function TitleZone({ className, text }: { className: string; text: string }) {
  return (
    <div className={cn("absolute border-2 border-dashed border-yellow-300/90 rounded-md flex flex-col justify-center px-[4%] text-white", className)}>
      <span className="font-bold leading-tight text-[clamp(9px,2.2vw,18px)] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)] line-clamp-2">{text}</span>
      <span className="text-[8px] sm:text-[10px] text-yellow-200 mt-0.5">▲ শিরোনামের জায়গা</span>
    </div>
  );
}

/**
 * Three framed previews (desktop · tablet · mobile) of how a banner will
 * really look, with the same overlays the website applies and the title area
 * drawn on top. Wrapped in LivePreview for its light/dark stage.
 */
export default function BannerDevicePreview({ kind, value, title }: { kind: BannerKind; value: string; title?: string }) {
  const { lang } = useLanguageStore();
  const bn = lang === "bn";
  if (!value) return null;
  const sample = title || (bn ? "পেজের শিরোনাম" : "Page title");
  const L = { desktop: bn ? "ডেস্কটপ" : "Desktop", tablet: bn ? "ট্যাবলেট" : "Tablet", mobile: bn ? "মোবাইল" : "Mobile" };
  const cover = "absolute inset-0 w-full h-full object-cover";

  let body: React.ReactNode;
  if (kind === "page-banner") {
    body = (
      <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr]">
        <div className="sm:col-span-2">
          <Frame device="desktop" label={`${L.desktop} · 1440px`} aspect="aspect-[1440/420]">
            <Media url={value} className={cover} />
            <div className="absolute inset-0" style={{ background: PAGE_BASE_SCRIM }} />
            <div className="absolute inset-0" style={{ background: PAGE_DESKTOP_SCRIM }} />
            <div
              className="absolute inset-0"
              style={{ backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", WebkitMaskImage: DESKTOP_BLUR_MASK, maskImage: DESKTOP_BLUR_MASK }}
            />
            <TitleZone className="left-[14%] top-[30%] w-[48%] h-[46%]" text={sample} />
          </Frame>
        </div>
        <Frame device="tablet" label={`${L.tablet} · 820px`} aspect="aspect-[820/360]">
          <Media url={value} className={cn(cover, "blur-[2px] scale-105")} />
          <div className="absolute inset-0" style={{ background: PAGE_BASE_SCRIM }} />
          <div className="absolute inset-0 bg-[rgba(10,22,40,0.55)]" />
          <TitleZone className="left-[5%] top-[28%] w-[85%] h-[50%]" text={sample} />
        </Frame>
        <Frame device="mobile" label={`${L.mobile} · 390px`} aspect="aspect-[390/190]">
          <Media url={value} className={cn(cover, "blur-[2px] scale-105")} />
          <div className="absolute inset-0" style={{ background: PAGE_BASE_SCRIM }} />
          <div className="absolute inset-0 bg-[rgba(10,22,40,0.55)]" />
          <TitleZone className="left-[5%] top-[30%] w-[90%] h-[50%]" text={sample} />
        </Frame>
      </div>
    );
  } else if (kind === "hero-desktop") {
    body = (
      <Frame device="desktop" label={`${L.desktop} · 1440×900`} aspect="aspect-[1440/860]">
        <Media url={value} className={cover} />
        <div className="absolute inset-0" style={{ background: HERO_SCRIM }} />
        <TitleZone className="left-[6%] top-[28%] w-[46%] h-[40%]" text={sample} />
        {/* Right column: promo card + stats card positions */}
        <div className="absolute right-[6%] top-[22%] w-[30%] aspect-video rounded-lg border-2 border-dashed border-white/70 bg-white/10 flex items-center justify-center text-[9px] sm:text-[11px] text-white text-center px-1">
          {bn ? "প্রোমো কার্ড" : "Promo card"}
        </div>
        <div className="absolute right-[6%] top-[46%] w-[30%] h-[30%] rounded-lg border-2 border-dashed border-white/70 bg-[#0c1330]/80 flex items-center justify-center text-[9px] sm:text-[11px] text-white text-center px-1">
          {bn ? "পরিসংখ্যান কার্ড" : "Stats card"}
        </div>
      </Frame>
    );
  } else {
    // hero-mobile / hero-promo: a 16:9 card, shown at card size per device.
    body = (
      <div className="grid gap-3 sm:grid-cols-3 items-end">
        {kind === "hero-promo" && (
          <Frame device="desktop" label={`${L.desktop} · 448px`} aspect="aspect-video">
            <Media url={value} className={cover} />
          </Frame>
        )}
        <Frame device="tablet" label={`${L.tablet} · 720px`} aspect="aspect-video">
          <Media url={value} className={cover} />
        </Frame>
        <Frame device="mobile" label={`${L.mobile} · 366px`} aspect="aspect-video">
          <Media url={value} className={cover} />
        </Frame>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <LivePreview showDevice={false} defaultDevice="desktop" titleBn={bn ? "তিন স্ক্রিনে যেমন দেখাবে" : "How it looks on each screen"}>
        <div className="pointer-events-none max-w-3xl mx-auto">{body}</div>
      </LivePreview>
    </div>
  );
}
