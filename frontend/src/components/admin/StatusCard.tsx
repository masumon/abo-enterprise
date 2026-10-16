"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusState = "ok" | "error" | "todo";

/** Collapsible card like the Backup steps: done → green ✓ and closed, problem → red ⚠
 * and open, not started → open. Click the header to open/close. `forceOpen` (e.g. a
 * deep link) opens it. Contents are untouched. */
export default function StatusCard({
  state, title, subtitle, leading, aside, forceOpen, id, className, children,
}: {
  state: StatusState;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leading?: React.ReactNode;
  /** Extra header controls (e.g. an on/off switch) — clicks on them do not toggle the card. */
  aside?: React.ReactNode;
  forceOpen?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(state !== "ok");
  // A card that turns red or is deep-linked opens itself; one that turns green closes.
  useEffect(() => { setOpen(state !== "ok"); }, [state]);
  useEffect(() => { if (forceOpen) setOpen(true); }, [forceOpen]);
  const badge = state === "ok"
    ? { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30", text: "ঠিক আছে", Icon: CheckCircle2 }
    : state === "error"
      ? { cls: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30", text: "সমস্যা আছে", Icon: AlertTriangle }
      : { cls: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30", text: "বাকি আছে", Icon: AlertTriangle };
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-2xl border p-4 transition", state === "error" ? "border-red-300 dark:border-red-500/40" : "border-gray-200 dark:border-white/10", className)}>
      <div className="flex items-center gap-3 min-h-11">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex flex-1 min-w-0 items-center gap-3 text-left min-h-11">
          {leading}
          <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-900 dark:text-gray-100">{title}</span>
            {subtitle && <span className="block text-xs text-gray-600 dark:text-gray-400 truncate">{subtitle}</span>}
          </span>
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ring-1 flex-none", badge.cls)}><badge.Icon className="w-3.5 h-3.5" aria-hidden />{badge.text}</span>
          <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform flex-none", open && "rotate-180")} aria-hidden />
        </button>
        {aside}
      </div>
      {open && <div className="pt-3 space-y-3">{children}</div>}
    </section>
  );
}
