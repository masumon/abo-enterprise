"use client";

import { Info } from "lucide-react";
import { useLanguageStore } from "@/store/language";
import { getDemoNotice } from "@/lib/demoFallback";

interface Props {
  show: boolean;
}

/** Shown when catalog is served from offline/demo fallback. */
export default function DemoModeBanner({ show }: Props) {
  const { lang } = useLanguageStore();
  if (!show) return null;
  const message = getDemoNotice(lang);
  if (!message) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 text-sm text-amber-900"
      role="status"
    >
      <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
