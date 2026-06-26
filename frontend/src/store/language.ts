import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Language } from "@/types";

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
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "en" ? "bn" : "en" }),
    }),
    {
      name: "abo-lang",
      storage: ssrSafeStorage,
      skipHydration: true,
    }
  )
);
