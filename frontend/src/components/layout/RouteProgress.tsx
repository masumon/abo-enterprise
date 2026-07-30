"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * GAP-04 — global route-transition indicator.
 *
 * Individual pages fetch client-side and show their own spinners, but a tap on
 * a nav item previously produced no visible feedback until the destination
 * began to paint. On a cold backend that can be several seconds, so some users
 * tap again.
 *
 * This bar signals only that navigation was acknowledged. It deliberately does
 * NOT replace per-page loading states: those answer "what is loading", this
 * answers "was my tap heard".
 *
 * A minimum visible duration is enforced so a cached route reads as feedback
 * rather than a glitch. Respects prefers-reduced-motion by skipping the width
 * transition (the bar still appears, it just does not animate).
 */
const MIN_VISIBLE_MS = 200;

export default function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [wide, setWide] = useState(false);
  const firstRender = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const growTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Do not flash on the very first paint — nothing was navigated to.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (growTimer.current) clearTimeout(growTimer.current);

    setVisible(true);
    setWide(false);
    growTimer.current = setTimeout(() => setWide(true), 20);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setWide(false);
    }, MIN_VISIBLE_MS + 250);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (growTimer.current) clearTimeout(growTimer.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
    >
      <div
        className="h-full bg-accent-500 motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out"
        style={{ width: wide ? "100%" : "15%" }}
      />
    </div>
  );
}
