import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  href: string;
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
