"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusCheck { label: string; ok: boolean; /** Why it is not OK / how to fix (optional). */ hint?: string }

/** One look for "is this part done?" everywhere in the admin: all checks pass → green ✓,
 * otherwise a short amber/red line that says exactly what is missing. */
export default function SectionStatus({ checks, className, compact }: { checks: StatusCheck[]; className?: string; compact?: boolean }) {
  const bad = checks.filter((c) => !c.ok);
  if (!checks.length) return null;
  if (!bad.length) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30", className)}>
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> ঠিক আছে
      </span>
    );
  }
  const text = bad.map((c) => (c.hint ? `${c.label} — ${c.hint}` : c.label)).join("; ");
  return (
    <span className={cn("inline-flex items-start gap-1 text-xs font-medium px-2.5 py-1 rounded-xl ring-1 bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30", compact && "max-w-full", className)} role="status">
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-none" aria-hidden />
      <span className="break-words">বাকি: {text}</span>
    </span>
  );
}
