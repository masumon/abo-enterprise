"use client";

import { Info } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getCachedNotice, getDemoNotice } from "@/lib/demoFallback";
import type { CatalogSource } from "@/lib/catalogLoader";

interface Props {
  show: boolean;
  source?: CatalogSource;
}

/** Shown when catalog is served from cache or demo fallback. */
export default function DemoModeBanner({ show, source = "demo" }: Props) {
  const { lang } = useLanguageStore();
  if (!show) return null;

  const message = source === "cache" ? getCachedNotice(lang) : getDemoNotice(lang);
  if (!message) return null;

  const styles =
    source === "cache"
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  const iconColor = source === "cache" ? "text-blue-600" : "text-amber-600";

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 flex items-start gap-3 text-sm ${styles}`}
      role="status"
    >
      <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} aria-hidden />
      <p>{message}</p>
    </div>
  );
}
