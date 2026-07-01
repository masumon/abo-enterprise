import { isSylhetArea } from "@/lib/bdDistricts";
import { getSettingValue } from "@/hooks/usePublicSettings";
import { generateWhatsAppOrderMessage } from "@/lib/utils";

export function calcDeliveryCharge(
  district: string,
  subtotalAfterDiscount: number,
  settings: Record<string, string>
): number {
  const freeMin = parseFloat(getSettingValue(settings, "free_delivery_min_amount") || "2000");
  if (subtotalAfterDiscount >= freeMin) return 0;

  const sylhetCharge = parseFloat(getSettingValue(settings, "delivery_charge_sylhet") || "0");
  const dhakaCharge = parseFloat(getSettingValue(settings, "delivery_charge_dhaka") || "60");
  const outsideCharge = parseFloat(getSettingValue(settings, "delivery_charge_outside") || "120");

  if (isSylhetArea(district)) return sylhetCharge;
  if (district === "Dhaka" || district === "Gazipur" || district === "Narayanganj") return dhakaCharge;
  return outsideCharge;
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
    getSettingValue(settings, "contact_phone") ||
    "8801825007977";
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
    result.openWhatsApp = `https://wa.me/${wa}?text=${msg}`;
  }

  if ((channel === "email" || channel === "both") && params.customerEmail) {
    const businessEmail = getSettingValue(params.settings, "contact_email") || "abo.enterprise@gmail.com";
    const subject = encodeURIComponent(
      `Order ${params.orderNumber ?? ""} — ABO Enterprise`.trim()
    );
    const body = encodeURIComponent(
      `Order: ${params.orderNumber ?? "—"}\nName: ${params.customerName}\nPhone: ${params.customerPhone}\nTotal: ৳${params.total}\nPayment: ${params.paymentLabel}${params.trxId ? `\nTrxID: ${params.trxId}` : ""}`
    );
    result.mailto = `mailto:${businessEmail}?subject=${subject}&body=${body}`;
  }

  return result;
}
