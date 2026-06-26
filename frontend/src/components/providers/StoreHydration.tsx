"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";

export default function StoreHydration() {
  const lang = useLanguageStore((s) => s.lang);

  useEffect(() => {
    useLanguageStore.persist.rehydrate();
    useCartStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }, [lang]);

  return null;
}
