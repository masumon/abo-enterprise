"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useBrandLogo } from "@/hooks/useBrandLogo";

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
        src={logoUrl}
        alt={alt}
        width={px}
        height={px}
        className="object-cover w-full h-full"
        priority={priority}
        sizes={`${px}px`}
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
