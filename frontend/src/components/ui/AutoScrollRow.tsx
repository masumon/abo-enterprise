"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";

/**
 * Reusable right-to-left, continuously auto-scrolling Swiper row. Shared by
 * the homepage's Feature Highlights, Brand Partners and Business Statistics
 * sections so they animate the same way instead of three separate
 * implementations. A near-zero autoplay delay plus a slow transition
 * `speed` produces a smooth marquee-style motion rather than discrete
 * slide-to-slide jumps; `reverseDirection` is what makes it right-to-left.
 */
interface AutoScrollRowProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  spaceBetween?: number;
  /** Lower = faster continuous scroll. */
  speed?: number;
  className?: string;
}

export default function AutoScrollRow<T>({
  items,
  renderItem,
  keyExtractor,
  spaceBetween = 16,
  speed = 6000,
  className,
}: AutoScrollRowProps<T>) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
  }, []);

  if (items.length === 0) return null;

  return (
    <Swiper
      modules={[Autoplay, FreeMode]}
      slidesPerView="auto"
      spaceBetween={spaceBetween}
      loop={items.length > 2}
      freeMode={{ enabled: true, momentum: false }}
      speed={speed}
      autoplay={
        reduceMotion
          ? false
          : { delay: 1, disableOnInteraction: false, reverseDirection: true, pauseOnMouseEnter: true }
      }
      allowTouchMove
      className={className}
    >
      {items.map((item, i) => (
        <SwiperSlide key={keyExtractor(item, i)} style={{ width: "auto" }}>
          {renderItem(item, i)}
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
