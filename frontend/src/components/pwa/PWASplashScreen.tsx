"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BRAND_LOGO_PATH } from "@/lib/brand";

const SESSION_KEY = "abo_pwa_splash_shown";
const SHOW_MS = 1400;
const FADE_MS = 450;

type Phase = "hidden" | "visible" | "fading";

/**
 * Branded launch splash for the installed PWA.
 *
 * Renders ONLY when the app runs in standalone display-mode (home-screen
 * launch) and only once per app session — regular browser visitors never
 * see it, so web vitals are unaffected.
 */
export default function PWASplashScreen() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const decided = useRef(false);

  // Phase-driven state machine: the advance timer is (re)scheduled from the
  // current phase, so a StrictMode/remount cleanup can never strand the
  // splash on screen with its timers cleared.
  useEffect(() => {
    if (phase === "hidden") {
      if (decided.current) return;
      decided.current = true;
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS Safari legacy flag
        (window.navigator as { standalone?: boolean }).standalone === true;
      if (!standalone) return;
      if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setPhase("visible");
      return;
    }
    const timer = window.setTimeout(
      () => setPhase(phase === "visible" ? "fading" : "hidden"),
      phase === "visible" ? SHOW_MS : FADE_MS
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity ease-out"
      style={{
        background: "linear-gradient(180deg, #2563a8 0%, #174a8c 100%)",
        opacity: phase === "fading" ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
      }}
    >
      <div className="relative w-32 h-32 rounded-full bg-white shadow-[0_0_0_10px_rgba(255,255,255,0.16),0_18px_45px_rgba(0,0,0,0.28)] overflow-hidden animate-scale-in">
        <Image src={BRAND_LOGO_PATH} alt="" fill sizes="128px" className="object-cover" priority />
      </div>
      <p className="mt-7 text-white font-bold text-2xl tracking-wide">ABO ENTERPRISE</p>
      <p className="mt-1 text-white/75 text-sm">Simple Solutions · সহজ সমাধান</p>
      <div className="mt-8 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-white/80 animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
