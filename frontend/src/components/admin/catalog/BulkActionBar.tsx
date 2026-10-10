"use client";

import type { ReactNode } from "react";
import { Loader2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { bnNum } from "@/lib/catalogAdminApi";
import { useBnEn } from "./useBnEn";

export interface BulkAction { bn: string; en: string; icon: LucideIcon; onClick: () => void; danger?: boolean }

/** Sticky bar shown while items are ticked: publish, hide, change category, delete… */
export default function BulkActionBar({ count, actions, busy, onClear, children }: {
  count: number;
  actions: BulkAction[];
  busy?: boolean;
  onClear: () => void;
  children?: ReactNode;
}) {
  const t = useBnEn();
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-500/30 rounded-xl px-3 py-2.5 shadow-sm">
      <span className="text-sm font-semibold text-brand-800 dark:text-brand-200">{t(`${bnNum(count)}টি বাছাই করা`, `${count} selected`)}</span>
      {actions.map((a) => (
        <button key={a.en} type="button" onClick={a.onClick} disabled={busy}
          className={cn("btn btn-outline btn-sm gap-1 bg-white dark:bg-transparent", a.danger && "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10")}>
          <a.icon className="w-3.5 h-3.5" /> {t(a.bn, a.en)}
        </button>
      ))}
      {children}
      {busy && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
      <button type="button" onClick={onClear} className="btn btn-ghost btn-sm ml-auto gap-1"><X className="w-3.5 h-3.5" /> {t("বাছাই মুছুন", "Clear")}</button>
    </div>
  );
}
