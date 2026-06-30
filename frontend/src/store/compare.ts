import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/types";

interface CompareStore {
  items: Product[];
  add: (product: Product) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

const storage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return localStorage;
});

const MAX = 3;

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product) => {
        const id = product.id ?? product.slug;
        if (get().items.some((p) => (p.id ?? p.slug) === id)) return;
        if (get().items.length >= MAX) return;
        set({ items: [...get().items, product] });
      },
      remove: (id) => set({ items: get().items.filter((p) => (p.id ?? p.slug) !== id) }),
      has: (id) => get().items.some((p) => (p.id ?? p.slug) === id),
      clear: () => set({ items: [] }),
    }),
    { name: "abo-compare", storage, skipHydration: true }
  )
);
