import { create } from "zustand";

interface AlertCounts {
  pendingOrders: number;
  pendingBookings: number;
  newLeads: number;
  newApplications?: number;
  lowStock?: number;
}

interface AlertStore extends Required<AlertCounts> {
  unreadNotifications: number;
  lastUpdated: Date | null;
  set: (counts: AlertCounts) => void;
  setUnread: (n: number) => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  pendingOrders: 0,
  pendingBookings: 0,
  newLeads: 0,
  newApplications: 0,
  lowStock: 0,
  unreadNotifications: 0,
  lastUpdated: null,
  set: (counts) => set({ ...counts, lastUpdated: new Date() }),
  setUnread: (n) => set({ unreadNotifications: n }),
}));
