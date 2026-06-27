import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  stockWarnings: string[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setStockWarnings: (warnings: string[]) => void;
  total: () => number;
  itemCount: () => number;
  savings: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      stockWarnings: [],

      addItem: (newItem) => {
        const maxQty = newItem.stock_quantity ?? 99;
        const existing = get().items.find((i) => i.product_id === newItem.product_id);
        if (existing) {
          const nextQty = Math.min(existing.quantity + 1, maxQty);
          set((state) => ({
            items: state.items.map((i) =>
              i.product_id === newItem.product_id ? { ...i, quantity: nextQty, stock_quantity: newItem.stock_quantity } : i
            ),
          }));
        } else {
          set((state) => ({
            items: [...state.items, { ...newItem, quantity: Math.min(1, maxQty) }],
          }));
        }
      },

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.product_id !== productId) })),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const item = get().items.find((i) => i.product_id === productId);
        const maxQty = item?.stock_quantity ?? 99;
        const clamped = Math.min(quantity, maxQty);
        set((state) => ({
          items: state.items.map((i) =>
            i.product_id === productId ? { ...i, quantity: clamped } : i
          ),
        }));
      },

      clearCart: () => set({ items: [], stockWarnings: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setStockWarnings: (warnings) => set({ stockWarnings: warnings }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      savings: () => 0,
    }),
    {
      name: "abo-cart",
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    }
  )
);
