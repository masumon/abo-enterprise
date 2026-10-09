"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { parseDhakaDateTime, weeklyEndDhaka } from "@/lib/flashSale";

export type CountdownSize = "sm" | "md" | "lg" | "xl";

/** Admin-selectable scale (Settings → Flash Sale → Text & Timer Size). */
const SIZES: Record<CountdownSize, { label: string; digit: string; gap: string; colon: string }> = {
  sm: { label: "text-xs", digit: "text-sm px-2 py-0.5", gap: "gap-2", colon: "text-sm" },
  md: { label: "text-sm sm:text-base", digit: "text-base sm:text-lg px-2.5 py-1", gap: "gap-2.5", colon: "text-base" },
  lg: { label: "text-base sm:text-lg", digit: "text-xl sm:text-2xl px-3 py-1.5", gap: "gap-3", colon: "text-xl" },
  xl: { label: "text-lg sm:text-2xl", digit: "text-2xl sm:text-4xl px-3.5 py-2", gap: "gap-3.5", colon: "text-2xl" },
};

/** Digit-block color themes. "red" (default) keeps every existing call site
 * unchanged; "gold" is opt-in for a premium/luxury treatment. */
const TONES = {
  red: { digit: "bg-gradient-to-b from-red-500 to-red-600 shadow-md shadow-red-600/30 ring-1 ring-inset ring-white/20 text-white", colon: "text-red-500" },
  gold: { digit: "bg-gradient-to-b from-[#f4dfa0] via-[#d4af37] to-[#a3801f] shadow-md shadow-black/40 ring-1 ring-inset ring-white/30 text-black", colon: "text-[#d4af37]" },
} as const;

interface Props {
  endDate: Date;
  className?: string;
  label?: string;
  /** Defaults to "md" — a readable step up from the original fixed size. */
  size?: CountdownSize;
  /** Emoji shown on both sides of the label. */
  icon?: string;
  /** Defaults to "red" — every existing usage keeps its current look. */
  tone?: keyof typeof TONES;
  /** Called once when the countdown reaches zero (so a parent can hide). */
  onExpire?: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer({ endDate, className, label, size = "md", icon = "⚡", tone = "red", onExpire }: Props) {
  const S = SIZES[size] ?? SIZES.md;
  const T = TONES[tone] ?? TONES.red;
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0, expired: false });
  // Depend on the timestamp, not the Date object: callers often build a new
  // Date every render, which used to restart this interval on every render.
  const endMs = endDate.getTime();
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const diff = endMs - Date.now();
      if (diff <= 0 || Number.isNaN(diff)) {
        setRemaining({ h: 0, m: 0, s: 0, expired: true });
        if (id !== undefined) clearInterval(id);
        id = undefined;
        onExpireRef.current?.();
        return false;
      }
      setRemaining({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
        expired: false,
      });
      return true;
    };
    if (tick()) id = setInterval(tick, 1000);
    return () => {
      if (id !== undefined) clearInterval(id);
    };
  }, [endMs]);

  if (remaining.expired) return null;

  return (
    <div
      className={cn("inline-flex flex-wrap items-center justify-center", S.gap, className)}
      role="timer"
      aria-live="polite"
    >
      {label && (
        <span className={cn("font-extrabold tracking-tight text-heading", S.label)}>
          {icon && <span aria-hidden>{icon} </span>}
          {label}
          {icon && <span aria-hidden> {icon}</span>}
        </span>
      )}
      <div className={cn("flex items-center gap-1.5 font-mono font-black", S.digit.split(" ")[0])}>
        {[remaining.h, remaining.m, remaining.s].map((unit, i) => (
          <span key={i} className="contents">
            {i > 0 && <span className={cn("font-bold", T.colon, S.colon)}>:</span>}
            <span className={cn("rounded-lg tabular-nums", T.digit, S.digit)}>
              {pad(unit)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** End of the current week (Sunday 23:59:59, Bangladesh time) — the default
 * flash-sale countdown when no explicit end exists. */
export function getWeeklySaleEnd(): Date {
  return weeklyEndDhaka(Date.now());
}

/**
 * Resolve the flash-sale end time from the admin-configured setting
 * (a `datetime-local` string like "2026-07-10T18:00", always Bangladesh
 * time). Falls back to the end of the current week when blank/invalid.
 * Kept for compatibility — new code uses getFlashSaleStatus (lib/flashSale).
 */
export function resolveFlashSaleEnd(endSetting?: string | null): Date {
  return parseDhakaDateTime(endSetting) ?? getWeeklySaleEnd();
}

/** True when the flash-sale window is currently open given admin settings. */
export function isFlashSaleActive(startSetting: string | null | undefined, end: Date): boolean {
  const now = Date.now();
  if (end.getTime() <= now) return false;
  const start = parseDhakaDateTime(startSetting);
  return !(start && start.getTime() > now);
}
