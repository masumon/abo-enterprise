"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import TranslateButton from "@/components/admin/TranslateButton";
import RichTextEditor from "@/components/admin/catalog/RichTextEditor";
import AiTextMenu from "@/components/admin/catalog/AiTextMenu";
import { cn } from "@/lib/utils";

/**
 * Bangla-first bilingual field: the admin writes Bangla; English sits in a
 * fold ("English — খালি থাকলে নিজে থেকে অনুবাদ") with one translate button.
 * `rows` unset = one-line input; `rich` = formatting toolbar + preview.
 */
export default function BnEnText({
  label, hint, required, bn, en, onBn, onEn, rows, rich, placeholderBn, placeholderEn, autoNote = true,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  bn?: string | null;
  en?: string | null;
  onBn: (v: string) => void;
  onEn: (v: string) => void;
  rows?: number;
  rich?: boolean;
  placeholderBn?: string;
  placeholderEn?: string;
  /** Say that a blank English box is translated on save. */
  autoNote?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasEn = !!(en ?? "").trim();
  const box = (value: string, set: (v: string) => void, ph: string | undefined, isBn: boolean) => {
    const name = isBn ? label : `${label} (English)`;
    if (rich) return <RichTextEditor value={value} onChange={set} rows={rows ?? 5} placeholder={ph} dir={isBn ? "auto" : undefined} label={name} />;
    if (rows) return <textarea value={value} onChange={(e) => set(e.target.value)} rows={rows} placeholder={ph} dir={isBn ? "auto" : undefined} className="input w-full resize-y text-sm" aria-label={name} />;
    return <input value={value} onChange={(e) => set(e.target.value)} placeholder={ph} dir={isBn ? "auto" : undefined} className="input w-full" aria-label={name} />;
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {!rich && <AiTextMenu text={bn ?? ""} onApply={onBn} context={label} compact />}
      </div>
      {box(bn ?? "", onBn, placeholderBn, true)}
      {hint && <p className="text-[11px] text-gray-500 dark:text-gray-400">{hint}</p>}
      <div className="rounded-lg border border-[var(--line)]">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs min-h-10 text-left">
          <span className="font-semibold text-gray-700 dark:text-gray-200">English</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px]", hasEn ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400")}>
            {hasEn ? "✓ লেখা আছে" : autoNote ? "খালি — সেভের সময় নিজে থেকে অনুবাদ" : "খালি"}
          </span>
          <ChevronDown className={cn("w-4 h-4 ml-auto text-gray-400 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="px-3 pb-3 space-y-1.5">
            <div className="flex justify-end">
              <TranslateButton bn={bn} en={en} onResult={onEn} onResultBn={onBn} />
            </div>
            {box(en ?? "", onEn, placeholderEn, false)}
          </div>
        )}
      </div>
    </div>
  );
}
