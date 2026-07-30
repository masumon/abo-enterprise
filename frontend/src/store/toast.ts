import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

/**
 * GAP-29 — a toast action was previously required to be a navigation link,
 * so a reversible operation (undo an add-to-cart, undo a wishlist removal)
 * could not be attached. `href` is kept for existing callers; `onClick` is
 * additive and optional. Supplying neither renders the action as inert, so
 * every existing call site keeps working unchanged.
 */
export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
  push: (type: ToastType, message: string, action?: ToastAction) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (type, message, action) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set({ toasts: [...get().toasts, { id, type, message, action }] });
    // Toasts with an action stay a bit longer so the admin can click it.
    setTimeout(() => get().dismiss(id), action ? 8000 : 4500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
