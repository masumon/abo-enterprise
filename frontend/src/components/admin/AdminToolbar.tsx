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
    <div className={cn("admin-toolbar", className)}>
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="admin-input pl-9 w-full"
          />
        </div>
      )}
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
