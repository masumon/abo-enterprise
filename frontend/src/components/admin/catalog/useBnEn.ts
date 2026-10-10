"use client";

import { useCallback } from "react";
import { useLanguageStore } from "@/store/language";

/** `t("বাংলা", "English")` — picks the admin's chosen language (default বাংলা). */
export function useBnEn() {
  const lang = useLanguageStore((s) => s.lang);
  return useCallback((bn: string, en: string) => (lang === "en" ? en : bn), [lang]);
}
