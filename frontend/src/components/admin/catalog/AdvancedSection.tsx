"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBnEn } from "./useBnEn";

/** Collapsed "⚙️ উন্নত" box for technical fields (slug, SKU, SEO…) — most are filled automatically when left blank. */
export default function AdvancedSection({ children, hintBn, hintEn, defaultOpen = false }: {
  children: ReactNode;
  hintBn?: string;
  hintEn?: string;
  defaultOpen?: boolean;
}) {
  const t = useBnEn();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[var(--line)] overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-left">
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold text-heading"><Settings2 className="w-4 h-4" /> {t("উন্নত (ঐচ্ছিক)", "Advanced (optional)")}</span>
          <span className="block text-[11px] text-muted mt-0.5">
            {t(hintBn ?? "খালি রাখলে নিজে থেকে পূরণ হবে — সাধারণত কিছু বদলাতে হয় না।", hintEn ?? "Left blank = filled automatically. Usually nothing to change.")}
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform flex-shrink-0", open && "rotate-180")} />
      </button>
      {/* Kept mounted (hidden) so registered inputs keep their values. */}
      <div className={cn("px-4 py-4 space-y-4", !open && "hidden")}>{children}</div>
    </div>
  );
}
