import { create } from "zustand";

interface AlertCounts {
  pendingOrders: number;
  pendingBookings: number;
  newLeads: number;
}

interface AlertStore extends AlertCounts {
  lastUpdated: Date | null;
  set: (counts: AlertCounts) => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  pendingOrders: 0,
  pendingBookings: 0,
  newLeads: 0,
  lastUpdated: null,
  set: (counts) => set({ ...counts, lastUpdated: new Date() }),
}));
