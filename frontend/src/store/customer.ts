import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CustomerSession {
  phone: string;
  name: string;
}

interface CustomerStore {
  session: CustomerSession | null;
  login: (phone: string, name: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

const storage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return localStorage;
});

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      session: null,
      login: (phone, name) => set({ session: { phone, name } }),
      logout: () => set({ session: null }),
      isLoggedIn: () => !!get().session?.phone,
    }),
    { name: "abo-customer", storage, skipHydration: true }
  )
);
