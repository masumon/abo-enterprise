import Image from "next/image";
import { BRAND_LOGO_PATH, BRAND_NAME } from "@/lib/brand";

/**
 * Route-level loading fallback (Next.js App Router). Rendered only while an
 * actual route transition is suspending. Intentionally minimal: a transparent
 * overlay with just the brand logo and a smooth spinning ring — no text,
 * progress bar, or panel — so it reads cleanly over any page background in
 * both light and dark. The spin pauses for users who prefer reduced motion.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[2px]"
    >
      <div className="relative w-20 h-20">
        {/* Smooth spinning ring around the logo */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border-[3px] border-brand-500/25 border-t-brand-600 animate-spin motion-reduce:animate-none"
        />
        {/* Static brand logo, centered */}
        <span className="absolute inset-[6px] rounded-full overflow-hidden bg-white shadow-sm flex items-center justify-center">
          <Image
            src={BRAND_LOGO_PATH}
            alt={BRAND_NAME}
            width={68}
            height={68}
            priority
            className="object-cover w-full h-full"
          />
        </span>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
