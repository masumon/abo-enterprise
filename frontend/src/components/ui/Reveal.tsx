"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  /** Render element (div, li, span…). Defaults to div. */
  as?: ElementType;
  className?: string;
  /** Stagger delay in ms before the reveal transition runs. */
  delay?: number;
  /** Only animate the first time it enters the viewport (default true). */
  once?: boolean;
}

/**
 * Lightweight scroll-reveal wrapper. When the element scrolls into view it
 * fades + slides up into place. Uses an IntersectionObserver (no animation
 * library) and honours prefers-reduced-motion by rendering fully visible with
 * no motion. `delay` lets callers stagger a grid/list of items.
 */
export default function Reveal({
  children,
  as,
  className,
  delay = 0,
  once = true,
}: RevealProps) {
  const Tag: ElementType = as ?? "div";
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion + browsers without IntersectionObserver: show now.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className
      )}
    >
      {children}
    </Tag>
  );
}
