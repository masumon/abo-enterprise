import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface WishlistItem {
  product_id: string;
  slug: string;
  name_en: string;
  name_bn: string;
  price: number;
  image_url?: string | null;
}

interface WishlistStore {
  items: WishlistItem[];
  toggle: (item: WishlistItem) => void;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
  count: () => number;
}

const ssrSafeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return localStorage;
});

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.product_id === item.product_id);
        set({
          items: exists
            ? get().items.filter((i) => i.product_id !== item.product_id)
            : [...get().items, item],
        });
      },
      has: (productId) => get().items.some((i) => i.product_id === productId),
      remove: (productId) =>
        set({ items: get().items.filter((i) => i.product_id !== productId) }),
      count: () => get().items.length,
    }),
    { name: "abo-wishlist", storage: ssrSafeStorage, skipHydration: true }
  )
);
