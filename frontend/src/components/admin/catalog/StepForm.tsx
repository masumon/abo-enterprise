"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, AlertCircle, Rows3, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBnEn } from "./useBnEn";

export interface FormStep {
  id: string;
  bn: string;
  en: string;
  /** ok = filled, warn = something important missing, undefined = neutral. */
  status?: "ok" | "warn";
  content: ReactNode;
}

const MODE_KEY = "abo_admin_form_mode";
type Mode = "steps" | "all";

function initialMode(): Mode {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "steps" || saved === "all") return saved;
  } catch { /* private mode */ }
  return typeof window !== "undefined" && window.innerWidth >= 1024 ? "all" : "steps";
}

/**
 * Wizard-like form: one step at a time on a phone ("ধাপে ধাপে"), or every
 * step on one page ("সব এক পাতায়") on a big screen — the admin can switch,
 * and the choice is remembered. All steps stay mounted, so typed values are
 * never lost when moving between steps.
 */
export default function StepForm({ steps, className }: { steps: FormStep[]; className?: string }) {
  const t = useBnEn();
  const [mode, setMode] = useState<Mode>("steps");
  const [current, setCurrent] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  // Read the saved/viewport mode after mount (SSR-safe).
  useEffect(() => { setMode(initialMode()); }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
  };

  const go = (i: number) => {
    const n = Math.max(0, Math.min(steps.length - 1, i));
    setCurrent(n);
    if (mode === "all") refs.current[n]?.scrollIntoView({ behavior: "smooth", block: "start" });
    else refs.current[n]?.closest("[data-step-scroll]")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <ol className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1" aria-label={t("ধাপসমূহ", "Steps")}>
          {steps.map((s, i) => {
            const active = mode === "steps" && i === current;
            return (
              <li key={s.id} className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs font-medium transition-colors",
                    active ? "bg-brand-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15",
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold",
                    active ? "bg-white/25" : s.status === "ok" ? "bg-emerald-500 text-white" : s.status === "warn" ? "bg-amber-400 text-white" : "bg-white dark:bg-white/10",
                  )}>
                    {!active && s.status === "ok" ? <Check className="w-3 h-3" /> : !active && s.status === "warn" ? <AlertCircle className="w-3 h-3" /> : i + 1}
                  </span>
                  {t(s.bn, s.en)}
                </button>
                {i < steps.length - 1 && <span className="w-3 h-px bg-gray-200 dark:bg-white/10 mx-0.5" />}
              </li>
            );
          })}
        </ol>
        <div className="flex rounded-lg border border-[var(--line)] p-0.5 text-[11px]" role="group" aria-label={t("দেখার ধরন", "Layout")}>
          <button type="button" onClick={() => switchMode("steps")} aria-pressed={mode === "steps"}
            className={cn("flex items-center gap-1 rounded-md px-2 py-1", mode === "steps" ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-muted")}>
            <ListOrdered className="w-3.5 h-3.5" /> {t("ধাপে ধাপে", "Step by step")}
          </button>
          <button type="button" onClick={() => switchMode("all")} aria-pressed={mode === "all"}
            className={cn("flex items-center gap-1 rounded-md px-2 py-1", mode === "all" ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" : "text-muted")}>
            <Rows3 className="w-3.5 h-3.5" /> {t("সব এক পাতায়", "All on one page")}
          </button>
        </div>
      </div>

      {steps.map((s, i) => (
        <section
          key={s.id}
          ref={(el) => { refs.current[i] = el; }}
          aria-label={t(s.bn, s.en)}
          className={cn("scroll-mt-4", mode === "steps" && i !== current && "hidden", mode === "all" && "rounded-2xl border border-[var(--line)] p-4")}
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-heading mb-3">
            <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">{i + 1}</span>
            {t(s.bn, s.en)}
          </h3>
          <div className="space-y-4">{s.content}</div>
          {mode === "steps" && (
            <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-[var(--line)]">
              <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="btn btn-outline btn-sm gap-1 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> {t("আগের ধাপ", "Back")}
              </button>
              <span className="text-xs text-muted">{t(`ধাপ ${i + 1} / ${steps.length}`, `Step ${i + 1} of ${steps.length}`)}</span>
              {i < steps.length - 1 ? (
                <button type="button" onClick={() => go(i + 1)} className="btn btn-brand btn-sm gap-1">
                  {t("পরের ধাপ", "Next")} <ChevronRight className="w-4 h-4" />
                </button>
              ) : <span className="w-[88px]" />}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
