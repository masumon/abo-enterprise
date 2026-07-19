/**
 * Accepts:
 *  - BD without country code: 01XXXXXXXXX
 *  - BD with country code: 8801XXXXXXXXX or +8801XXXXXXXXX
 *  - International (order from outside BD): +<country code><number> (7–15 digits)
 * Delivery address stays inside Bangladesh; only the phone may be foreign.
 */
export const BD_PHONE_REGEX = /^(?:0|\+?880)1[3-9]\d{8}$|^\+[1-9]\d{6,14}$/;

export const BD_PHONE_PLACEHOLDER = "01XXXXXXXXX বা +8801… / +971…";

export function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(phone.trim().replace(/[\s()-]/g, ""));
}

export const BD_PHONE_ERROR_EN = "Enter a valid phone (BD 01XXXXXXXXX, or international with country code +…)";
export const BD_PHONE_ERROR_BN = "সঠিক নম্বর দিন (BD 01XXXXXXXXX, অথবা কান্ট্রি কোডসহ আন্তর্জাতিক +…)";

export function normalizeBdPhoneDigits(phone: string): string {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return digits;                   // international — keep as typed
  if (digits.startsWith("880")) return digits;              // BD with country code
  if (/^01[3-9]\d{8}$/.test(digits)) return `880${digits.slice(1)}`;  // BD local → 880…
  return digits;                                            // anything else — keep digits, don't force 880
}

export function formatBdPhoneDisplay(phone: string): string {
  const digits = normalizeBdPhoneDigits(phone);
  if (!digits.startsWith("880")) return phone;
  const local = digits.slice(3);
  if (local.length < 10) return `+${digits}`;
  return `+880 ${local.slice(0, 4)} ${local.slice(4, 10)}`;
}

export function toBdTelHref(phone: string): string {
  const digits = normalizeBdPhoneDigits(phone);
  return digits ? `tel:+${digits}` : "";
}

export function toBdWhatsappHref(phone: string): string {
  const digits = normalizeBdPhoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : "";
}
