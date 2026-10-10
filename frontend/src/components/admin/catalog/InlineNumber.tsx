"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBnEn } from "./useBnEn";

/**
 * Click-to-edit number for list pages (price, stock). Enter / leaving the box
 * saves, Esc cancels. `onSave` throws to keep the editor open.
 */
export default function InlineNumber({ value, onSave, prefix = "", label, className, min = 0 }: {
  value: number | null | undefined;
  onSave: (v: number) => Promise<void>;
  prefix?: string;
  label: string;
  className?: string;
  min?: number;
}) {
  const t = useBnEn();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const start = () => { setDraft(value == null ? "" : String(value)); setEditing(true); };
  const commit = async () => {
    const n = Number(draft);
    if (draft.trim() === "" || Number.isNaN(n) || n < min || n === Number(value ?? NaN)) { setEditing(false); return; }
    setBusy(true);
    try { await onSave(n); setEditing(false); } catch { /* caller shows the error */ } finally { setBusy(false); }
  };

  if (editing) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          min={min}
          value={draft}
          aria-label={label}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          className="input !py-1 !px-2 w-24 text-sm"
        />
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" />}
      </span>
    );
  }
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); start(); }} title={t("চাপ দিয়ে বদলান", "Click to change")} aria-label={`${label}: ${value ?? "—"}`}
      className={cn("group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 hover:bg-brand-50 dark:hover:bg-white/10", className)}>
      <span>{value == null ? "—" : `${prefix}${value}`}</span>
      <Pencil className="w-3 h-3 text-gray-300 group-hover:text-brand-500" />
    </button>
  );
}
