import { useEffect, useRef } from "react";
import { adminApi } from "@/lib/api";
import { useAlertStore } from "@/store/alerts";
import { useToastStore } from "@/store/toast";

const POLL_INTERVAL = 30_000; // 30 seconds

export function useAdminPolling() {
  const setAlerts = useAlertStore((s) => s.set);
  const toast = useToastStore((s) => s.push);
  // Track previous counts to detect new items between polls
  const prev = useRef({ pendingOrders: -1, pendingBookings: -1, newLeads: -1 });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const r = await adminApi.stats();
        if (cancelled) return;
        const data = r.data.data as {
          pending_orders: number;
          pending_bookings: number;
          new_leads: number;
        };

        const pendingOrders = data.pending_orders ?? 0;
        const pendingBookings = data.pending_bookings ?? 0;
        const newLeads = data.new_leads ?? 0;

        // Notify only after first successful poll (prev starts at -1)
        if (prev.current.pendingOrders >= 0) {
          if (pendingOrders > prev.current.pendingOrders) {
            const diff = pendingOrders - prev.current.pendingOrders;
            toast("info", `${diff} new order${diff > 1 ? "s" : ""} received`);
          }
          if (pendingBookings > prev.current.pendingBookings) {
            const diff = pendingBookings - prev.current.pendingBookings;
            toast("info", `${diff} new booking${diff > 1 ? "s" : ""} received`);
          }
          if (newLeads > prev.current.newLeads) {
            const diff = newLeads - prev.current.newLeads;
            toast("info", `${diff} new lead${diff > 1 ? "s" : ""} received`);
          }
        }

        prev.current = { pendingOrders, pendingBookings, newLeads };
        setAlerts({ pendingOrders, pendingBookings, newLeads });
      } catch {
        // Silent fail — network errors during polling should not disrupt the UI
      }
    }

    poll();
    const timer = setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [setAlerts, toast]);
}
