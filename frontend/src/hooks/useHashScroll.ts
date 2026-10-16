"use client";

import { useEffect, useRef } from "react";

/**
 * Deep links inside admin pages: /sumon/backup#backup-drives scrolls to that section once
 * the page's data has rendered (the browser's own jump fires too early), opens a <details>
 * if the target is one, and briefly highlights it.
 */
export function useHashScroll(ready: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    if (!ready || done.current) return;
    done.current = true;
    const id = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!id) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-4", "ring-brand-200");
      setTimeout(() => el.classList.remove("ring-4", "ring-brand-200"), 3500);
    });
  }, [ready]);
}
