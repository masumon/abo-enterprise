"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useCustomerStore } from "@/store/customer";
import { useCustomerProfileStore } from "@/store/customerProfile";
import { useThemeStore, applyTheme } from "@/store/theme";

export default function StoreHydration() {
  const lang = useLanguageStore((s) => s.lang);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    useLanguageStore.persist.rehydrate();
    useCartStore.persist.rehydrate();
    useWishlistStore.persist.rehydrate();
    useCompareStore.persist.rehydrate();
    useCustomerStore.persist.rehydrate();
    useCustomerProfileStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }, [lang]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return null;
}
