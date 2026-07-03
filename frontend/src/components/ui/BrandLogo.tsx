"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useBrandLogo } from "@/hooks/useBrandLogo";
import { BRAND_LOGO_PATH } from "@/lib/brand";

const SIZES = {
  xs: 32,
  sm: 36,
  md: 48,
  lg: 56,
  xl: 80,
} as const;

type BrandLogoSize = keyof typeof SIZES;

interface BrandLogoProps {
  size?: BrandLogoSize;
  /** light = on dark bg, brand = navbar/footer, glass = hero/dashboard */
  variant?: "brand" | "light" | "glass";
  href?: string | false;
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({
  size = "sm",
  variant = "brand",
  href = false,
  className,
  priority,
}: BrandLogoProps) {
  const { logoUrl, alt } = useBrandLogo();
  const px = SIZES[size];
  // If the CMS-configured logoUrl 404s or the domain is unreachable, fall
  // back to the bundled brand asset. Prevents the "broken image icon +
  // 'ABO Enterp…' truncated" first impression on Login / Register etc.
  const [errored, setErrored] = useState(false);
  const src = errored ? BRAND_LOGO_PATH : logoUrl;

  const frame = (
    <span
      className={cn(
        "brand-logo inline-flex flex-shrink-0 items-center justify-center overflow-hidden",
        variant === "brand" && "brand-logo--brand",
        variant === "light" && "brand-logo--light",
        variant === "glass" && "brand-logo--glass",
        className
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        className="object-cover w-full h-full"
        priority={priority}
        sizes={`${px}px`}
        onError={() => setErrored(true)}
      />
    </span>
  );

  if (href !== false) {
    return (
      <Link href={href || "/"} className="inline-flex flex-shrink-0" aria-label={alt}>
        {frame}
      </Link>
    );
  }

  return frame;
}

/** PWA / notifications — same logo as generated app icons */
export function BrandAppIcon({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { appIconUrl, alt } = useBrandLogo();
  return (
    <span
      className={cn("brand-logo brand-logo--brand inline-flex overflow-hidden flex-shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={appIconUrl}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        sizes={`${size}px`}
      />
    </span>
  );
}
