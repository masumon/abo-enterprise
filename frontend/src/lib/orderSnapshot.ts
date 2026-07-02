import type { PublicInvoiceData } from "@/lib/api";

/**
 * Local snapshot of the just-placed order/booking, written at checkout time.
 * Lets the success page render an invoice summary instantly — and even when
 * the invoice API is unreachable (slow network, PWA offline, backend cold
 * start) — using data the client already had.
 */
export interface OrderSnapshot {
  kind: "order" | "booking";
  reference: string; // order_number or booking id
  phone: string;
  customer_name: string;
  payment_method: string;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  subtotal: number;
  delivery_charge: number;
  total: number;
  order_number?: string;
  booking_number?: string;
  service_name?: string;
  created_at: string;
}

const KEY = "abo_last_checkout";

export function saveOrderSnapshot(snapshot: OrderSnapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable (private mode) — success page falls back to API only */
  }
}

export function readOrderSnapshot(reference: string): OrderSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as OrderSnapshot;
    return snap.reference === reference ? snap : null;
  } catch {
    return null;
  }
}

/** Shape the snapshot like the API invoice so InvoiceCard can render it. */
export function snapshotToInvoice(snap: OrderSnapshot): PublicInvoiceData {
  return {
    invoice_number: "",
    payment_method: snap.payment_method,
    payment_status: "pending",
    customer_name: snap.customer_name,
    customer_phone: snap.phone,
    items: snap.items,
    subtotal: snap.subtotal,
    tax: 0,
    total: snap.total,
    issued_date: snap.created_at,
    created_at: snap.created_at,
    order_number: snap.order_number ?? null,
    delivery_charge: snap.delivery_charge,
    booking_number: snap.booking_number ?? null,
    service_name: snap.service_name ?? null,
  };
}
