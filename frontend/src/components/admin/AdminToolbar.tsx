"use client";

import { type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/i18n/adminText";

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
  const tx = useAdminT();
  return (
    <div className={cn("admin-toolbar relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" />
      {onSearchChange !== undefined && (
        <div className="relative w-full min-w-0 max-w-xl min-[641px]:w-auto min-[641px]:flex-1 min-[641px]:min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tx(searchPlaceholder)}
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
