"use client";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}

export default function SectionHeader({
  badge,
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-10 md:mb-12",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      {badge && (
        <span className="inline-flex items-center text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800 px-3 py-1 rounded-full mb-3">
          {badge}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-heading text-balance">{title}</h2>
      {subtitle && (
        <p className={cn("text-muted mt-3 max-w-2xl text-sm sm:text-base leading-relaxed", align === "center" && "mx-auto")}>
          {subtitle}
        </p>
      )}
      <div className={cn("section-divider mt-4", align === "left" && "mx-0")} />
    </div>
  );
}
