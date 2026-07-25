"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CountdownSize = "sm" | "md" | "lg" | "xl";

/** Admin-selectable scale (Settings → Flash Sale → Text & Timer Size). */
const SIZES: Record<CountdownSize, { label: string; digit: string; gap: string; colon: string }> = {
  sm: { label: "text-xs", digit: "text-sm px-2 py-0.5", gap: "gap-2", colon: "text-sm" },
  md: { label: "text-sm sm:text-base", digit: "text-base sm:text-lg px-2.5 py-1", gap: "gap-2.5", colon: "text-base" },
  lg: { label: "text-base sm:text-lg", digit: "text-xl sm:text-2xl px-3 py-1.5", gap: "gap-3", colon: "text-xl" },
  xl: { label: "text-lg sm:text-2xl", digit: "text-2xl sm:text-4xl px-3.5 py-2", gap: "gap-3.5", colon: "text-2xl" },
};

interface Props {
  endDate: Date;
  className?: string;
  label?: string;
  /** Defaults to "md" — a readable step up from the original fixed size. */
  size?: CountdownSize;
  /** Emoji shown on both sides of the label. */
  icon?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer({ endDate, className, label, size = "md", icon = "⚡" }: Props) {
  const S = SIZES[size] ?? SIZES.md;
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0, expired: false });

  useEffect(() => {
    const tick = () => {
      const diff = endDate.getTime() - Date.now();
      if (diff <= 0) {
        setRemaining({ h: 0, m: 0, s: 0, expired: true });
        return;
      }
      setRemaining({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

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
            {i > 0 && <span className={cn("text-red-500 font-bold", S.colon)}>:</span>}
            <span
              className={cn(
                "rounded-lg bg-gradient-to-b from-red-500 to-red-600 text-white tabular-nums",
                "shadow-md shadow-red-600/30 ring-1 ring-inset ring-white/20",
                S.digit
              )}
            >
              {pad(unit)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Returns end of current week Sunday 23:59:59 for flash sale countdown */
export function getWeeklySaleEnd(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setDate(now.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Resolve the flash-sale end time from the admin-configured setting
 * (a `datetime-local` string like "2026-07-10T18:00"). Falls back to the
 * end of the current week when the admin hasn't set one or it's invalid,
 * so behaviour is unchanged when the field is left blank.
 */
export function resolveFlashSaleEnd(endSetting?: string | null): Date {
  if (endSetting && endSetting.trim()) {
    const parsed = new Date(endSetting);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return getWeeklySaleEnd();
}

/** True when the flash-sale window is currently open given admin settings. */
export function isFlashSaleActive(startSetting: string | null | undefined, end: Date): boolean {
  const now = Date.now();
  if (end.getTime() <= now) return false;
  if (startSetting && startSetting.trim()) {
    const start = new Date(startSetting);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now) return false;
  }
  return true;
}
