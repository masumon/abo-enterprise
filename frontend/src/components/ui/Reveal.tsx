"use client";

import type { ElementType, ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Render element (div, li, span…). Defaults to div. */
  as?: ElementType;
  className?: string;
  /** Kept for compatibility; no longer used. */
  delay?: number;
  /** Kept for compatibility; no longer used. */
  once?: boolean;
}

/**
 * Formerly a scroll-reveal (fade + slide up). Removed on purpose: content now simply stays in place
 * while scrolling/swiping — no items sliding in from below, no layout flicker. The component is kept
 * as a plain wrapper so every existing usage keeps working unchanged.
 */
export default function Reveal({ children, as, className }: RevealProps) {
  const Tag: ElementType = as ?? "div";
  return <Tag className={className}>{children}</Tag>;
}
