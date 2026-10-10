"use client";

import Link from "next/link";
import { Camera, PenLine, FileSpreadsheet } from "lucide-react";
import { useAiAvailable } from "@/lib/useAiAvailable";
import { cn } from "@/lib/utils";
import { useBnEn } from "./useBnEn";

interface Props {
  /** What is being added, for the button sub-text. */
  thing: { bn: string; en: string };
  onForm: () => void;
  /** Photo → AI draft. Hidden when no AI key is configured. */
  onAi?: () => void;
  /** Excel / CSV bulk import page (products only). */
  excelHref?: string;
  /** Big tiles (empty page) instead of the compact row. */
  large?: boolean;
  className?: string;
}

/**
 * The same three ways to add something on every catalog page:
 * 📸 ছবি দিয়ে (AI) · ✍️ ফর্মে যোগ করুন · 📄 Excel দিয়ে.
 */
export default function AddEntryChoices({ thing, onForm, onAi, excelHref, large, className }: Props) {
  const t = useBnEn();
  const aiOk = useAiAvailable();
  const tile = cn(
    "group flex items-center gap-3 rounded-2xl border text-left transition-all",
    "border-[var(--line)] bg-white dark:bg-white/[0.03] hover:border-brand-400 hover:shadow-md hover:-translate-y-0.5",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
    large ? "p-4 sm:p-5" : "p-3",
  );
  const iconBox = (color: string) =>
    cn("flex-shrink-0 rounded-xl flex items-center justify-center", large ? "w-12 h-12" : "w-10 h-10", color);
  const title = cn("font-semibold text-heading", large ? "text-base" : "text-sm");
  const sub = "text-xs text-muted leading-snug";

  return (
    <div className={className}>
      <p className={cn("font-semibold text-heading mb-2", large ? "text-base" : "text-sm")}>
        {t(`নতুন ${thing.bn} যোগ করুন — যেভাবে সুবিধা:`, `Add a new ${thing.en} — pick a way:`)}
      </p>
      <div className={cn("grid gap-2 sm:gap-3", [onAi && aiOk, true, !!excelHref].filter(Boolean).length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {onAi && aiOk && (
          <button type="button" onClick={onAi} className={tile}>
            <span className={iconBox("bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300")}><Camera className="w-5 h-5" /></span>
            <span className="min-w-0">
              <span className={cn(title, "block")}>📸 {t("ছবি দিয়ে (AI)", "From a photo (AI)")}</span>
              <span className={sub}>{t("ছবি দিন — AI নাম ও বিবরণ লিখে দেবে", "Give a photo — AI writes the name & text")}</span>
            </span>
          </button>
        )}
        <button type="button" onClick={onForm} className={tile}>
          <span className={iconBox("bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300")}><PenLine className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className={cn(title, "block")}>✍️ {t("ফর্মে যোগ করুন", "Fill a form")}</span>
            <span className={sub}>{t("ধাপে ধাপে নিজে লিখুন", "Type it in, step by step")}</span>
          </span>
        </button>
        {excelHref && (
          <Link href={excelHref} className={tile}>
            <span className={iconBox("bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300")}><FileSpreadsheet className="w-5 h-5" /></span>
            <span className="min-w-0">
              <span className={cn(title, "block")}>📄 {t("Excel দিয়ে", "From Excel")}</span>
              <span className={sub}>{t("একসাথে অনেকগুলো — ফাইল ও ছবি দিন", "Many at once — sheet + photos")}</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
