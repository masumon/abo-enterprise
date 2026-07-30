import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Language } from "@/types";
import { writeLangCookie } from "@/lib/lang";

interface LanguageStore {
  lang: Language;
  setLang: (lang: Language) => void;
  toggle: () => void;
}

const ssrSafeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
});

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: "bn",
      // GAP-24 — every change is mirrored to a cookie so the next request can
      // be server-rendered in the right language instead of repainting.
      setLang: (lang) => {
        writeLangCookie(lang);
        set({ lang });
      },
      toggle: () => {
        const next: Language = get().lang === "en" ? "bn" : "en";
        writeLangCookie(next);
        set({ lang: next });
      },
    }),
    {
      name: "abo-lang",
      storage: ssrSafeStorage,
      skipHydration: true,
    }
  )
);
