"use client";

import { getBrandFullTitle, getBrandName, getBrandTagline, type BrandLang } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface BrandMottoProps {
  lang: BrandLang;
  className?: string;
  variant?: "tagline" | "full";
}

export default function BrandMotto({ lang, className, variant = "tagline" }: BrandMottoProps) {
  const text = variant === "full" ? getBrandFullTitle(lang) : getBrandTagline(lang);
  return <span className={cn(className)}>{text}</span>;
}

export function BrandTitleBlock({
  lang,
  className,
  brandClassName,
  taglineClassName,
}: {
  lang: BrandLang;
  className?: string;
  brandClassName?: string;
  taglineClassName?: string;
}) {
  return (
    <span className={cn("block", className)}>
      <span className={cn("block", brandClassName)}>{getBrandName(lang)}</span>
      <span className={cn("block", taglineClassName)}>
        <span className="opacity-80">: </span>
        {getBrandTagline(lang)}
      </span>
    </span>
  );
}
