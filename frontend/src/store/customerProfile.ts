import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  phone: string;
  isDefault: boolean;
}

interface CustomerProfileStore {
  addresses: SavedAddress[];
  email: string;
  notifyOrders: boolean;
  notifyOffers: boolean;
  /** The customer's own photo (small JPEG data URL, kept on this device). */
  avatar: string;
  setAvatar: (dataUrl: string) => void;
  addAddress: (addr: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  updateSettings: (data: Partial<Pick<CustomerProfileStore, "email" | "notifyOrders" | "notifyOffers">>) => void;
}

const storage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return localStorage;
});

export const useCustomerProfileStore = create<CustomerProfileStore>()(
  persist(
    (set, get) => ({
      addresses: [],
      email: "",
      notifyOrders: true,
      notifyOffers: false,
      avatar: "",
      setAvatar: (avatar) => set({ avatar }),
      addAddress: (addr) => {
        const id = `addr-${Date.now()}`;
        const addresses = get().addresses.map((a) =>
          addr.isDefault ? { ...a, isDefault: false } : a
        );
        set({ addresses: [...addresses, { ...addr, id }] });
      },
      removeAddress: (id) =>
        set({ addresses: get().addresses.filter((a) => a.id !== id) }),
      setDefaultAddress: (id) =>
        set({
          addresses: get().addresses.map((a) => ({ ...a, isDefault: a.id === id })),
        }),
      updateSettings: (data) => set(data),
    }),
    { name: "abo-customer-profile", storage, skipHydration: true }
  )
);
