"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

interface Props {
  title: string;
  description?: ReactNode;
  titleBn?: string;
  /** Optional Bengali description; falls back to `description` when absent. */
  descriptionBn?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function AdminPageHeader({ title, description, titleBn, descriptionBn, actions, className }: Props) {
  const { lang } = useLanguageStore();

  // Show one heading in the selected language. Repeating the English title
  // beneath a Bengali heading left mixed-language UI after switching to Bangla.
  const primary = lang === "bn" ? titleBn ?? title : title;
  const desc = lang === "bn" ? descriptionBn ?? description : description;

  return (
    <div className={cn("admin-page-header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-[var(--border,#e5e9f0)] dark:border-white/10 pb-4", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {/* Subtle brand accent rail — premium touch, theme-aware. */}
        <span className="mt-1 h-9 w-1.5 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 flex-shrink-0" aria-hidden />
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight text-balance">{primary}</h1>
          {desc && (
            <p className="text-sm text-muted max-w-3xl leading-relaxed">{desc}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">{actions}</div>
      )}
    </div>
  );
}
