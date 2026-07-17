"use client";

import Link from "next/link";
import { type LucideIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_MAP = {
  brand: "from-brand-500/12 via-brand-500/6 to-white border-brand-100 text-brand-700 hover:border-brand-200",
  accent: "from-accent-500/12 via-accent-500/6 to-white border-accent-100 text-accent-700 hover:border-accent-200",
  green: "from-green-500/12 via-green-500/6 to-white border-green-100 text-green-700 hover:border-green-200",
  amber: "from-amber-500/12 via-amber-500/6 to-white border-amber-100 text-amber-700 hover:border-amber-200",
};

interface Action {
  href: string;
  label: string;
  labelBn?: string;
  icon: LucideIcon;
  color?: keyof typeof COLOR_MAP;
  badge?: number;
}

interface Props {
  actions: Action[];
}

export default function AdminQuickActions({ actions }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map(({ href, label, labelBn, icon: Icon, color = "brand", badge }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group relative flex flex-col gap-2 rounded-2xl border bg-gradient-to-br p-4 transition-all duration-200",
            "shadow-sm hover:-translate-y-0.5 hover:shadow-md",
            COLOR_MAP[color]
          )}
        >
          <div className="flex items-center justify-between">
            <Icon className="w-5 h-5 opacity-80" />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{labelBn ?? label}</p>
            {labelBn && <p className="text-[10px] opacity-60 mt-0.5">{label}</p>}
          </div>
          {badge !== undefined && badge > 0 && (
            <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
