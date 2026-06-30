"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useCustomerStore } from "@/store/customer";
import { useCustomerProfileStore } from "@/store/customerProfile";
import { useThemeStore, applyTheme } from "@/store/theme";
import { usePublicSettings } from "@/hooks/usePublicSettings";

export default function StoreHydration() {
  const pathname = usePathname();
  const lang = useLanguageStore((s) => s.lang);
  const theme = useThemeStore((s) => s.theme);
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  usePublicSettings();

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
    applyTheme(isAdmin ? "light" : theme);
  }, [theme, isAdmin]);

  return null;
}
