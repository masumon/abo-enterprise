"use client";

import { BRAND_FULL_TITLE, BRAND_NAME, BRAND_TAGLINE_BILINGUAL } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface BrandMottoProps {
  className?: string;
  /** tagline only: "Simple Solution · সহজ সমাধান" */
  variant?: "tagline" | "full";
}

/** Bilingual brand line — same in EN/BN UI */
export default function BrandMotto({ className, variant = "tagline" }: BrandMottoProps) {
  const text = variant === "full" ? BRAND_FULL_TITLE : BRAND_TAGLINE_BILINGUAL;
  return <span className={cn(className)}>{text}</span>;
}

export function BrandTitleBlock({
  className,
  brandClassName,
  taglineClassName,
}: {
  className?: string;
  brandClassName?: string;
  taglineClassName?: string;
}) {
  return (
    <span className={cn("block", className)}>
      <span className={cn("block", brandClassName)}>{BRAND_NAME}</span>
      <span className={cn("block", taglineClassName)}>
        <span className="opacity-80">: </span>
        {BRAND_TAGLINE_BILINGUAL}
      </span>
    </span>
  );
}
