import { useEffect, useRef } from "react";
import { adminApi } from "@/lib/api";
import { useAlertStore } from "@/store/alerts";
import { useToastStore } from "@/store/toast";

const POLL_INTERVAL = 30_000; // 30 seconds
const FAILURE_THRESHOLD = 3; // Show "sync failed" only after 3 consecutive failures

export function useAdminPolling(enabled = true) {
  const setAlerts = useAlertStore((s) => s.set);
  const toast = useToastStore((s) => s.push);
  const prev = useRef({ pendingOrders: -1, pendingBookings: -1, newLeads: -1 });
  const failureCountRef = useRef(0);
  const lastSyncFailedToastRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
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
            toast("info", `${diff} new order${diff > 1 ? "s" : ""} received`, { label: "View", href: "/admin/orders" });
          }
          if (pendingBookings > prev.current.pendingBookings) {
            const diff = pendingBookings - prev.current.pendingBookings;
            toast("info", `${diff} new booking${diff > 1 ? "s" : ""} received`, { label: "View", href: "/admin/bookings" });
          }
          if (newLeads > prev.current.newLeads) {
            const diff = newLeads - prev.current.newLeads;
            toast("info", `${diff} new lead${diff > 1 ? "s" : ""} received`, { label: "View", href: "/admin/leads" });
          }
        }

        prev.current = { pendingOrders, pendingBookings, newLeads };
        setAlerts({ pendingOrders, pendingBookings, newLeads });
        failureCountRef.current = 0; // Reset on success
        if (lastSyncFailedToastRef.current) {
          toast("success", "Dashboard sync restored");
          lastSyncFailedToastRef.current = false;
        }
      } catch (err) {
        failureCountRef.current += 1;
        if (failureCountRef.current >= FAILURE_THRESHOLD && !lastSyncFailedToastRef.current) {
          toast("error", "Dashboard stats sync failed (retrying)");
          lastSyncFailedToastRef.current = true;
        }
      }
    }

    poll();
    const timer = setInterval(() => {
      // Skip polls while the tab is hidden — saves backend quota and battery.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      poll();
    }, POLL_INTERVAL);
    // Catch up immediately when the admin returns to the tab.
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, setAlerts, toast]);
}
