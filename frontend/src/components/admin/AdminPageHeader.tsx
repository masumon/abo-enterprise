"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  titleBn?: string;
  actions?: ReactNode;
  className?: string;
}

export default function AdminPageHeader({ title, description, titleBn, actions, className }: Props) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {titleBn && (
          <p className="text-sm text-brand-600/80 font-medium mt-0.5">{titleBn}</p>
        )}
        {description && (
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
