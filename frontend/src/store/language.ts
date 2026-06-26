import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Language } from "@/types";

interface LanguageStore {
  lang: Language;
  setLang: (lang: Language) => void;
  toggle: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: "bn",
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "en" ? "bn" : "en" }),
    }),
    { name: "abo-lang" }
  )
);
