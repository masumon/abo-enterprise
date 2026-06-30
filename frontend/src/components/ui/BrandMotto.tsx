"use client";

import { BRAND_TAGLINE } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface BrandMottoProps {
  lang: "en" | "bn";
  className?: string;
}

export default function BrandMotto({ lang, className }: BrandMottoProps) {
  const text = lang === "bn" ? BRAND_TAGLINE.bn : BRAND_TAGLINE.en;
  return <span className={cn(className)}>{text}</span>;
}
