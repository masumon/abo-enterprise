"use client";

import { type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  className?: string;
}

export default function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
  className,
}: Props) {
  return (
    <div className={cn("admin-toolbar relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" />
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[200px] max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="admin-input w-full pl-9"
          />
        </div>
      )}
      {children && (
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">{children}</div>
      )}
    </div>
  );
}
