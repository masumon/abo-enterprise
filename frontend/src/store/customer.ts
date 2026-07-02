import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CustomerSession {
  phone: string;
  name: string;
  /** JWT issued by /customer/verify-otp — proves phone ownership. */
  token: string;
}

interface CustomerStore {
  session: CustomerSession | null;
  login: (phone: string, name: string, token: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  getToken: () => string | null;
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
      login: (phone, name, token) => set({ session: { phone, name, token } }),
      logout: () => set({ session: null }),
      // Legacy sessions (pre-OTP) have no token — treat them as logged out so
      // the user re-verifies once instead of hitting 401s everywhere.
      isLoggedIn: () => !!get().session?.phone && !!get().session?.token,
      getToken: () => get().session?.token ?? null,
    }),
    { name: "abo-customer", storage, skipHydration: true }
  )
);
