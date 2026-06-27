"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  endDate: Date;
  className?: string;
  label?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export default function CountdownTimer({ endDate, className, label }: Props) {
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
    <div className={cn("inline-flex items-center gap-2", className)} role="timer" aria-live="polite">
      {label && <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>}
      <div className="flex gap-1 font-mono text-sm font-bold">
        <span className="bg-red-500 text-white px-2 py-0.5 rounded">{pad(remaining.h)}</span>
        <span className="text-red-500">:</span>
        <span className="bg-red-500 text-white px-2 py-0.5 rounded">{pad(remaining.m)}</span>
        <span className="text-red-500">:</span>
        <span className="bg-red-500 text-white px-2 py-0.5 rounded">{pad(remaining.s)}</span>
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
