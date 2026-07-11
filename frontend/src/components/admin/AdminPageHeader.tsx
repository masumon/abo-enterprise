"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/language";

interface Props {
  title: string;
  description?: string;
  titleBn?: string;
  /** Optional Bengali description; falls back to `description` when absent. */
  descriptionBn?: string;
  actions?: ReactNode;
  className?: string;
}

export default function AdminPageHeader({ title, description, titleBn, descriptionBn, actions, className }: Props) {
  const { lang } = useLanguageStore();

  // Respect the admin top-bar language toggle (which already localizes the
  // sidebar + breadcrumbs). When Bengali is selected and a Bengali title is
  // provided, show it as the primary heading with English as the secondary
  // line — so the page headline matches the Bengali navigation instead of
  // always leading in English. Falls back gracefully when titleBn is absent.
  const useBn = lang === "bn" && !!titleBn;
  const primary = useBn ? titleBn : title;
  const secondary = useBn ? title : titleBn;
  const desc = lang === "bn" ? descriptionBn ?? description : description;

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{primary}</h1>
        {secondary && (
          <p className="text-sm text-brand-600/80 font-medium mt-0.5">{secondary}</p>
        )}
        {desc && (
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{desc}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
