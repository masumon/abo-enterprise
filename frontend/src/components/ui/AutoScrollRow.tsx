"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable right-to-left, continuously auto-scrolling marquee row. Shared by
 * the homepage's category cards, feature icons, brand partners and business
 * statistics so they all animate the same way.
 *
 * A pure-CSS marquee: the track holds two identical halves and slides left by
 * exactly one half, so the loop is seamless and constant-speed at any screen
 * width. (The earlier Swiper-based version only looped when the slides
 * overflowed the container, moved left-to-right and stuttered.)
 *
 * - Pauses on hover and keyboard focus; static + scrollable under
 *   prefers-reduced-motion (see `.abo-marquee` in globals.css).
 * - `minSlides` repeats the list so one half is wider than the container even
 *   when there are only a few items. Repeats are hidden from assistive tech.
 */
interface AutoScrollRowProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  /** Gap between items, px. */
  spaceBetween?: number;
  /** Scroll speed in px per second. */
  pxPerSecond?: number;
  /** Repeat the list until at least this many slides exist per half. */
  minSlides?: number;
  className?: string;
}

export default function AutoScrollRow<T>({
  items,
  renderItem,
  keyExtractor,
  spaceBetween = 16,
  pxPerSecond = 40,
  minSlides = 0,
  className,
}: AutoScrollRowProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(60);

  // One half of the track = total scroll distance; derive the duration from
  // its real width so speed stays constant regardless of content.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const half = el.scrollWidth / 2;
      if (half > 0) setDuration(Math.max(10, half / pxPerSecond));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pxPerSecond, items.length, minSlides]);

  if (items.length === 0) return null;

  const reps = minSlides > items.length ? Math.ceil(minSlides / items.length) : 1;
  // half 0 is the accessible copy; every other repeat/half is decorative.
  const half = (h: number) =>
    Array.from({ length: reps }, (_, r) =>
      items.map((item, i) => {
        const hidden = h > 0 || r > 0;
        return (
          <div
            key={`${keyExtractor(item, i)}__${h}_${r}`}
            className="flex-none"
            style={{ marginRight: spaceBetween }}
            aria-hidden={hidden ? true : undefined}
            {...(hidden ? ({ inert: "" } as Record<string, string>) : {})}
          >
            {renderItem(item, i)}
          </div>
        );
      }),
    );

  return (
    <div className={cn("abo-marquee relative overflow-hidden", className)}>
      <div
        ref={trackRef}
        className="abo-marquee-track flex w-max"
        style={{ animationDuration: `${duration}s` }}
      >
        {half(0)}
        {half(1)}
      </div>
    </div>
  );
}
