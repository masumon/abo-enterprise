"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBnEn } from "./useBnEn";

/** Small on/off switch: প্রকাশিত (live) / খসড়া (hidden). */
export default function ActiveSwitch({ active, busy, onChange, showLabel = true }: {
  active: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void;
  showLabel?: boolean;
}) {
  const t = useBnEn();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={busy}
      onClick={(e) => { e.stopPropagation(); onChange(!active); }}
      title={active ? t("সাইটে দেখা যাচ্ছে — চাপলে লুকাবে", "Live — click to hide") : t("লুকানো আছে — চাপলে প্রকাশ হবে", "Hidden — click to publish")}
      className="inline-flex items-center gap-2 disabled:opacity-50"
    >
      <span className={cn("relative w-9 h-5 rounded-full transition-colors flex-shrink-0", active ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/20")}>
        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform flex items-center justify-center", active && "translate-x-4")}>
          {busy && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
        </span>
      </span>
      {showLabel && <span className={cn("text-xs font-medium", active ? "text-emerald-700 dark:text-emerald-300" : "text-muted")}>{active ? t("প্রকাশিত", "Live") : t("খসড়া", "Draft")}</span>}
    </button>
  );
}
