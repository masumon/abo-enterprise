import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";
import { trackEvent } from "@/components/analytics/GoogleAnalytics";

/** A combo (bundle) line in the cart. Kept separate from product items so the
 * product path is untouched; the server re-derives the price at order time. */
export interface CartCombo {
  combo_id: string;
  title_en: string;
  title_bn: string;
  price: number;
  image_url?: string | null;
  free_delivery: boolean;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  combos: CartCombo[];
  isOpen: boolean;
  stockWarnings: string[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  addCombo: (combo: Omit<CartCombo, "quantity">) => void;
  removeCombo: (comboId: string) => void;
  updateComboQty: (comboId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setStockWarnings: (warnings: string[]) => void;
  total: () => number;
  comboTotal: () => number;
  itemCount: () => number;
  savings: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      combos: [],
      isOpen: false,
      stockWarnings: [],

      addItem: (newItem) => {
        // GA4 e-commerce funnel signal
        trackEvent("add_to_cart", { currency: "BDT", value: Number(newItem.price) || 0 });
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

      addCombo: (combo) => {
        trackEvent("add_to_cart", { currency: "BDT", value: Number(combo.price) || 0 });
        const existing = get().combos.find((c) => c.combo_id === combo.combo_id);
        if (existing) {
          set((state) => ({
            combos: state.combos.map((c) =>
              c.combo_id === combo.combo_id ? { ...c, quantity: Math.min(c.quantity + 1, 99) } : c
            ),
          }));
        } else {
          set((state) => ({ combos: [...state.combos, { ...combo, quantity: 1 }] }));
        }
      },
      removeCombo: (comboId) =>
        set((state) => ({ combos: state.combos.filter((c) => c.combo_id !== comboId) })),
      updateComboQty: (comboId, quantity) => {
        if (quantity <= 0) { get().removeCombo(comboId); return; }
        set((state) => ({
          combos: state.combos.map((c) =>
            c.combo_id === comboId ? { ...c, quantity: Math.min(quantity, 99) } : c
          ),
        }));
      },

      clearCart: () => set({ items: [], combos: [], stockWarnings: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setStockWarnings: (warnings) => set({ stockWarnings: warnings }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      comboTotal: () => get().combos.reduce((sum, c) => sum + c.price * c.quantity, 0),
      itemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0) +
        get().combos.reduce((sum, c) => sum + c.quantity, 0),
      savings: () => 0,
    }),
    {
      name: "abo-cart",
      partialize: (state) => ({ items: state.items, combos: state.combos }),
      skipHydration: true,
    }
  )
);
