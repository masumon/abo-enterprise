"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/store/language";

export default function HtmlLangSync() {
  const { lang } = useLanguageStore();

  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }, [lang]);

  return null;
}
