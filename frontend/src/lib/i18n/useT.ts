"use client";

import { useLanguageStore } from "@/store/language";
import { t, type TranslationKey } from "./translations";

export function useT() {
  const lang = useLanguageStore((s) => s.lang);
  return (key: TranslationKey) => t(lang, key);
}
