import type { PaymentMethodRecord } from "@/lib/api";

export interface CheckoutPaymentOption {
  id: string;
  gateway: string;
  label: string;
  detail: string;
  icon: string;
  color: string;
  requiresTrxId: boolean;
  isManual: boolean;
}

const GATEWAY_META: Record<string, { label: string; icon: string; color: string; requiresTrxId: boolean; isManual: boolean }> = {
  bkash: { label: "bKash", icon: "💳", color: "#E2136E", requiresTrxId: true, isManual: true },
  nagad: { label: "Nagad", icon: "📱", color: "#F05A28", requiresTrxId: true, isManual: true },
  rocket: { label: "Rocket", icon: "🚀", color: "#8B1FA8", requiresTrxId: true, isManual: true },
  bank: { label: "Bank Transfer", icon: "🏦", color: "#1E5BA8", requiresTrxId: true, isManual: true },
  bank_transfer: { label: "Bank Transfer", icon: "🏦", color: "#1E5BA8", requiresTrxId: true, isManual: true },
  cod: { label: "Cash on Delivery", icon: "💵", color: "#16a34a", requiresTrxId: false, isManual: false },
  cash_on_delivery: { label: "Cash on Delivery", icon: "💵", color: "#16a34a", requiresTrxId: false, isManual: false },
  sslcommerz: { label: "Card / Mobile Banking", icon: "🔒", color: "#2E7D32", requiresTrxId: false, isManual: false },
  upay: { label: "Upay", icon: "💰", color: "#0A84FF", requiresTrxId: true, isManual: true },
  tap: { label: "Tap", icon: "💳", color: "#FF6B35", requiresTrxId: true, isManual: true },
};

/** One active method per gateway — live DB may have duplicate seeds (005 + 007 migrations). */
function dedupePaymentMethods(methods: PaymentMethodRecord[]): PaymentMethodRecord[] {
  const best = new Map<string, PaymentMethodRecord>();
  for (const m of methods) {
    if (!m.is_active) continue;
    const prev = best.get(m.payment_gateway);
    if (!prev) {
      best.set(m.payment_gateway, m);
      continue;
    }
    const prevOrder = prev.sort_order ?? 999;
    const nextOrder = m.sort_order ?? 999;
    if (nextOrder < prevOrder || (nextOrder === prevOrder && (m.account_identifier || "") > (prev.account_identifier || ""))) {
      best.set(m.payment_gateway, m);
    }
  }
  return Array.from(best.values());
}

const FALLBACK_METHODS: CheckoutPaymentOption[] = [
  { id: "fb-bkash", gateway: "bkash", label: "bKash", detail: "Send Money", icon: "💳", color: "#E2136E", requiresTrxId: true, isManual: true },
  { id: "fb-nagad", gateway: "nagad", label: "Nagad", detail: "Send Money", icon: "📱", color: "#F05A28", requiresTrxId: true, isManual: true },
  { id: "fb-cod", gateway: "cod", label: "Cash on Delivery", detail: "Pay on delivery", icon: "💵", color: "#16a34a", requiresTrxId: false, isManual: false },
];

export function mapPaymentMethods(methods: PaymentMethodRecord[], lang: "en" | "bn"): CheckoutPaymentOption[] {
  const active = dedupePaymentMethods(methods);
  if (active.length === 0) {
    return FALLBACK_METHODS.map((m) => ({
      ...m,
      detail: lang === "bn" ? (m.gateway === "cod" ? "ডেলিভারির সময়" : "Send Money") : m.detail,
    }));
  }
  return active
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => {
      const meta = GATEWAY_META[m.payment_gateway] ?? {
        label: m.payment_gateway,
        icon: "💳",
        color: "#1E5BA8",
        requiresTrxId: true,
        isManual: true,
      };
      const isCod = m.payment_gateway === "cod" || m.payment_gateway === "cash_on_delivery";
      const detail =
        m.account_identifier ||
        m.description ||
        (isCod
          ? lang === "bn" ? "ডেলিভারির সময় পরিশোধ" : "Pay on delivery"
          : lang === "bn" ? "Send Money" : "Send Money");
      return {
        id: m.id,
        gateway: m.payment_gateway,
        label: meta.label,
        detail,
        icon: meta.icon,
        color: meta.color,
        requiresTrxId: meta.requiresTrxId,
        isManual: meta.isManual,
      };
    });
}
