import { isSylhetArea } from "@/lib/bdDistricts";
import { getSettingValue } from "@/hooks/usePublicSettings";
import { generateWhatsAppOrderMessage } from "@/lib/utils";
import type { DeliveryZone } from "@/lib/api";

function getNumericSetting(settings: Record<string, string>, key: string): number | null {
  const raw = getSettingValue(settings, key).trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function calcDeliveryCharge(
  district: string,
  subtotalAfterDiscount: number,
  settings: Record<string, string>,
  /** Highest per-product delivery override in the cart (0 = none). */
  maxProductCharge = 0,
  /** Admin-defined zones (public list) + the customer's upazila. */
  opts?: { upazila?: string; zones?: DeliveryZone[] }
): number | null {
  // 1) Admin-defined delivery zones take precedence. The first active zone whose
  // districts include this district — and, when the zone lists upazilas, whose
  // upazilas include the customer's — decides the charge. free_threshold > 0
  // grants free delivery at or above that subtotal.
  const upazila = opts?.upazila?.trim();
  for (const z of opts?.zones ?? []) {
    if (!z.is_active) continue;
    if (!z.districts?.includes(district)) continue;
    if (z.upazilas?.length && !(upazila && z.upazilas.includes(upazila))) continue;
    if (z.free_threshold && z.free_threshold > 0 && subtotalAfterDiscount >= z.free_threshold) return 0;
    return Math.max(z.charge || 0, maxProductCharge || 0);
  }

  // 2) Legacy settings-based 3-tier fallback. All business amounts must come
  // from the Admin settings; if configuration is incomplete, return null so
  // checkout can block instead of silently inventing or undercharging a fee.
  const isSylhet = isSylhetArea(district);
  const freeMin = getNumericSetting(settings, "free_delivery_min_amount");
  const sylhetCharge = getNumericSetting(settings, "delivery_charge_sylhet");
  const dhakaCharge = getNumericSetting(settings, "delivery_charge_dhaka");
  const outsideCharge = getNumericSetting(settings, "delivery_charge_outside");
  if (freeMin === null || sylhetCharge === null || dhakaCharge === null || outsideCharge === null) return null;

  if (isSylhet && subtotalAfterDiscount >= freeMin) return 0;

  let zone: number;
  if (isSylhet) zone = sylhetCharge;
  else if (district === "Dhaka" || district === "Gazipur" || district === "Narayanganj") zone = dhakaCharge;
  else zone = outsideCharge;

  return Math.max(zone, maxProductCharge || 0);
}

/** The advance/prepaid amount when any cart item is flagged requires_advance. */
export function calcAdvanceCharge(
  items: { requires_advance?: boolean }[],
  settings: Record<string, string>
): number | null {
  const needs = items.some((i) => i.requires_advance);
  if (!needs) return 0;
  return getNumericSetting(settings, "advance_delivery_charge");
}

export type ConfirmChannel = "whatsapp" | "email" | "both" | "none";

export function getConfirmChannel(settings: Record<string, string>): ConfirmChannel {
  const v = getSettingValue(settings, "checkout_confirm_channel") || "none";
  if (v === "whatsapp" || v === "email" || v === "both") return v;
  return "none";
}

export function getWhatsAppNumber(settings: Record<string, string>): string {
  const raw =
    getSettingValue(settings, "whatsapp_number") ||
    getSettingValue(settings, "contact_phone");
  return raw.replace(/\D/g, "");
}

export function buildOrderConfirmActions(params: {
  settings: Record<string, string>;
  lang: "en" | "bn";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  district: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  paymentLabel: string;
  trxId?: string;
  orderNumber?: string | null;
}): { openWhatsApp?: string; mailto?: string } {
  const channel = getConfirmChannel(params.settings);
  const result: { openWhatsApp?: string; mailto?: string } = {};

  const fullAddress = `${params.deliveryAddress}, ${params.district}`;
  const msg = generateWhatsAppOrderMessage(
    params.customerName,
    params.customerPhone,
    fullAddress,
    params.items,
    params.total,
    params.paymentLabel + (params.trxId ? ` (TrxID: ${params.trxId})` : "")
  );

  if (channel === "whatsapp" || channel === "both") {
    const wa = getWhatsAppNumber(params.settings);
    if (wa) result.openWhatsApp = `https://wa.me/${wa}?text=${msg}`;
  }

  if ((channel === "email" || channel === "both") && params.customerEmail) {
    const businessEmail = getSettingValue(params.settings, "contact_email").trim();
    if (businessEmail) {
      const subject = encodeURIComponent(
        `Order ${params.orderNumber ?? ""} — ABO Enterprise`.trim()
      );
      const body = encodeURIComponent(
        `Order: ${params.orderNumber ?? "—"}\nName: ${params.customerName}\nPhone: ${params.customerPhone}\nTotal: ৳${params.total}\nPayment: ${params.paymentLabel}${params.trxId ? `\nTrxID: ${params.trxId}` : ""}`
      );
      result.mailto = `mailto:${businessEmail}?subject=${subject}&body=${body}`;
    }
  }

  return result;
}
