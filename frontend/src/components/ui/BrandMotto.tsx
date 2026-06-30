"use client";

import { BRAND_HEADLINE, BRAND_TAGLINE } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface BrandMottoProps {
  lang: "en" | "bn";
  layout?: "stack" | "inline";
  show?: "both" | "headline" | "tagline";
  className?: string;
  headlineClassName?: string;
  taglineClassName?: string;
}

export default function BrandMotto({
  lang,
  layout = "stack",
  show = "both",
  className,
  headlineClassName,
  taglineClassName,
}: BrandMottoProps) {
  const headline = lang === "bn" ? BRAND_HEADLINE.bn : BRAND_HEADLINE.en;
  const tagline = lang === "bn" ? BRAND_TAGLINE.bn : BRAND_TAGLINE.en;

  if (show === "headline") {
    return <span className={cn(className, headlineClassName)}>{headline}</span>;
  }
  if (show === "tagline") {
    return <span className={cn(className, taglineClassName)}>{tagline}</span>;
  }

  if (layout === "inline") {
    return (
      <span className={cn(className, headlineClassName)}>
        {headline}
        <span className={cn("opacity-80", taglineClassName)}> · {tagline}</span>
      </span>
    );
  }

  return (
    <span className={cn("block", className)}>
      <span className={cn("block", headlineClassName)}>{headline}</span>
      <span className={cn("block", taglineClassName)}>{tagline}</span>
    </span>
  );
}
