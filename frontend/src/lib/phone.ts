/** Bangladesh mobile: 01XXXXXXXXX (11 digits) */
export const BD_PHONE_REGEX = /^0[13-9]\d{9}$/;

export const BD_PHONE_PLACEHOLDER = "01XXXXXXXXX";

export function isValidBdPhone(phone: string): boolean {
  return BD_PHONE_REGEX.test(phone.trim());
}

export const BD_PHONE_ERROR_EN = "Valid BD number: 01XXXXXXXXX (11 digits)";
export const BD_PHONE_ERROR_BN = "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)";

export function normalizeBdPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return `880${digits}`;
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
