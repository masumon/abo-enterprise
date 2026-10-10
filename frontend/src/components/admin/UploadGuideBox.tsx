"use client";

import { HelpCircle } from "lucide-react";
import type { UploadGuide } from "@/lib/uploadGuides";
import { isVideoUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const PREVIEW_BG: Record<NonNullable<UploadGuide["previewBg"]>, string> = {
  white: "bg-[#fff]",
  dark: "bg-gray-900",
  // Checkerboard = "transparent" — shows whether a logo really has no background.
  checker:
    "bg-[#fff] [background-image:linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] [background-size:12px_12px] [background-position:0_0,0_6px,6px_-6px,-6px_0]",
};

/** Small frame drawn at the site's real ratio/fit, so the admin sees the crop. */
export function GuidePreviewFrame({ guide, src }: { guide: UploadGuide; src?: string }) {
  const circle = guide.shape === "circle";
  // Keep the frame small: tall images get a narrower box.
  const width = circle ? 72 : guide.ratio >= 1 ? 160 : Math.round(110 * guide.ratio);
  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className={cn(
          "relative overflow-hidden border border-gray-200 dark:border-white/15 flex items-center justify-center text-[10px] text-gray-400",
          circle ? "rounded-full" : "rounded-lg",
          PREVIEW_BG[guide.previewBg ?? "white"],
        )}
        style={{ width, aspectRatio: circle ? "1 / 1" : String(guide.ratio) }}
      >
        {src ? (
          isVideoUrl(src) ? (
            <video src={src} muted playsInline className={cn("absolute inset-0 w-full h-full", guide.fit === "contain" ? "object-contain" : "object-cover")} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- tiny admin preview, any origin
            <img src={src} alt="" className={cn("absolute inset-0 w-full h-full", guide.fit === "contain" ? "object-contain p-1" : "object-cover")} />
          )
        ) : (
          <span className="px-1 text-center">{guide.ratioLabel}</span>
        )}
      </div>
      <span className="text-[10px] text-gray-400">ওয়েবসাইটে এভাবে দেখাবে ({guide.ratioLabel})</span>
    </div>
  );
}

/** Collapsible "কীভাবে দেবেন?" box — closed by default so forms stay short. */
export default function UploadGuideBox({ guide, src }: { guide: UploadGuide; src?: string }) {
  const rows: [string, string][] = [
    ["মাপ", guide.size],
    ["ব্যাকগ্রাউন্ড", guide.background],
    ["মূল বিষয়", guide.subject],
    ["ফরম্যাট", guide.format],
    ["সর্বোচ্চ সাইজ", guide.maxSize],
    ["কোথায় দেখাবে", guide.whereBn],
  ];
  return (
    <details className="group rounded-lg border border-brand-100 dark:border-white/10 bg-brand-50/40 dark:bg-white/5 text-xs">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-2.5 py-1.5 font-semibold text-brand-700 dark:text-brand-300 list-none [&::-webkit-details-marker]:hidden">
        <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
        <span>কীভাবে দেবেন? — {guide.titleBn}</span>
        <span className="ml-auto text-[10px] font-normal text-gray-400 group-open:hidden">খুলুন</span>
      </summary>
      <div className="flex flex-wrap gap-3 px-2.5 pb-2.5 pt-1">
        <dl className="flex-1 min-w-[200px] space-y-1 text-gray-600 dark:text-gray-300">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-1.5">
              <dt className="w-24 flex-shrink-0 font-medium text-gray-500 dark:text-gray-400">{k}:</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
          {guide.tips?.map((tip) => (
            <p key={tip} className="text-gray-500 dark:text-gray-400">• {tip}</p>
          ))}
        </dl>
        <GuidePreviewFrame guide={guide} src={src} />
      </div>
    </details>
  );
}
