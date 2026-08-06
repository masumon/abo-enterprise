"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguageStore } from "@/store/language";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { useCompareStore } from "@/store/compare";
import { useCustomerStore } from "@/store/customer";
import { useCustomerProfileStore } from "@/store/customerProfile";
import { useThemeStore, applyTheme } from "@/store/theme";
import { usePublicSettings } from "@/hooks/usePublicSettings";
import { writeLangCookie, normalizeLang } from "@/lib/lang";

export default function StoreHydration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = useLanguageStore((s) => s.lang);
  const theme = useThemeStore((s) => s.theme);
  const isAdmin = pathname?.startsWith("/sumon") ?? false;
  usePublicSettings();

  useEffect(() => {
    useLanguageStore.persist.rehydrate();
    // GAP-01 — URL param priority: if ?lang=en is in URL, apply it immediately
    // before writing cookie. This allows shareable language-specific links.
    const urlLang = searchParams.get("lang");
    const langToUse = urlLang ? normalizeLang(urlLang) : useLanguageStore.getState().lang;
    useLanguageStore.getState().setLang(langToUse);
    // GAP-24 — visitors who already had a language in localStorage have no
    // cookie yet, so seed it from the rehydrated value; the next request then
    // renders server-side in their language.
    writeLangCookie(langToUse);
    useCartStore.persist.rehydrate();
    useWishlistStore.persist.rehydrate();
    useCompareStore.persist.rehydrate();
    useCustomerStore.persist.rehydrate();
    useCustomerProfileStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
  }, [searchParams]);

  useEffect(() => {
    document.documentElement.lang = lang === "bn" ? "bn" : "en";
  }, [lang]);

  useEffect(() => {
    applyTheme(isAdmin ? "light" : theme);
  }, [theme, isAdmin]);

  return null;
}
