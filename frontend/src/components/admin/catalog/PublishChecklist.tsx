"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBnEn } from "./useBnEn";

export interface CheckItem { bn: string; en: string; ok: boolean }

/** Pre-publish checklist: ছবি ✓ দাম ✓ বিবরণ ✓ ক্যাটাগরি ✓ — warns, never blocks a draft. */
export default function PublishChecklist({ items, className }: { items: CheckItem[]; className?: string }) {
  const t = useBnEn();
  const missing = items.filter((i) => !i.ok);
  return (
    <div className={cn(
      "rounded-xl border p-3",
      missing.length ? "border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10" : "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10",
      className,
    )}>
      <p className="text-sm font-semibold text-heading mb-2">{t("প্রকাশের আগে দেখে নিন", "Before publishing")}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((i) => (
          <li key={i.en} className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            i.ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
          )}>
            {i.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            {t(i.bn, i.en)} {i.ok ? "✓" : ""}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted mt-2">
        {missing.length
          ? t(`${missing.map((m) => m.bn).join(", ")} বাকি — খসড়া হিসেবে সেভ করা যাবে, পরে পূরণ করে প্রকাশ করুন।`,
              `${missing.map((m) => m.en).join(", ")} missing — you can save a draft and publish later.`)
          : t("সব ঠিক আছে — প্রকাশ করতে পারেন।", "All set — ready to publish.")}
      </p>
    </div>
  );
}
