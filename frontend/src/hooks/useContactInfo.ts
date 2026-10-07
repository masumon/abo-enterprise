"use client";

import { usePublicSettings, getSettingValue } from "@/hooks/usePublicSettings";
import { formatBdPhoneDisplay, normalizeBdPhoneDigits } from "@/lib/phone";

export const CONTACT_SETTING_KEYS = ["whatsapp_number", "contact_phone", "contact_email", "business_email"];

export interface ContactInfo {
  /** Digits only, ready for wa.me (e.g. 8801XXXXXXXXX). Empty when not configured. */
  whatsappDigits: string;
  whatsappDisplay: string;
  /** Call number as stored by the admin. Empty when not configured. */
  phone: string;
  phoneDisplay: string;
  telHref: string;
  email: string;
  hasWhatsapp: boolean;
  hasPhone: boolean;
  /** `https://wa.me/<digits>` or `/contact` when no number is configured (append `?text=…`). */
  waBase: string;
  /** wa.me link with optional prefilled text; falls back to /contact when no number is configured. */
  whatsappHref: (message?: string) => string;
}

/**
 * Single source of truth for how customers reach the business. Everything comes
 * from the admin settings (`whatsapp_number`, `contact_phone`, `contact_email`)
 * — nothing is hard-coded, so changing a number in the admin panel updates the
 * whole site. WhatsApp falls back to the call number when no separate WhatsApp
 * number is set.
 */
export function buildContactInfo(settings: Record<string, string>): ContactInfo {
  const phone = getSettingValue(settings, "contact_phone").trim();
  const waRaw = getSettingValue(settings, "whatsapp_number").trim() || phone;
  const whatsappDigits = normalizeBdPhoneDigits(waRaw);
  const phoneDigits = normalizeBdPhoneDigits(phone);
  const email = (getSettingValue(settings, "contact_email") || getSettingValue(settings, "business_email")).trim();
  return {
    whatsappDigits,
    whatsappDisplay: whatsappDigits ? formatBdPhoneDisplay(waRaw) : "",
    phone,
    phoneDisplay: phone ? formatBdPhoneDisplay(phone) : "",
    telHref: phoneDigits ? `tel:+${phoneDigits}` : "",
    email,
    waBase: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "/contact",
    hasWhatsapp: Boolean(whatsappDigits),
    hasPhone: Boolean(phoneDigits),
    whatsappHref: (message?: string) =>
      whatsappDigits
        ? `https://wa.me/${whatsappDigits}${message ? `?text=${encodeURIComponent(message)}` : ""}`
        : "/contact",
  };
}

export function useContactInfo(): ContactInfo {
  const { settings } = usePublicSettings(CONTACT_SETTING_KEYS);
  return buildContactInfo(settings);
}
