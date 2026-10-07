import { isValidBdPhone } from "@/lib/phone";
import { sanitizeBusinessHours } from "@/lib/businessHours";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Friendly (Bengali) checks for the admin Settings form. Returns the first clear
 * mistake or null. Empty values are always allowed — these rules only catch typos
 * that would show customers wrong contact details, never block a valid save.
 */
export function validateSettingValues(
  fields: { key: string; label?: string }[],
  values: Record<string, string>,
): string | null {
  const brand = (values.site_name ?? "").trim();
  for (const { key } of fields) {
    const v = (values[key] ?? "").trim();
    if (!v) continue;
    if ((key === "contact_phone" || key === "whatsapp_number") && !isValidBdPhone(v.replace(/[\s-]/g, ""))) {
      return `${key === "whatsapp_number" ? "হোয়াটসঅ্যাপ" : "ফোন"} নম্বরটি সঠিক নয়। লিখুন 01XXXXXXXXX অথবা +8801XXXXXXXXX (শুধু সংখ্যা, দেশের কোডসহ)।`;
    }
    if ((key === "contact_email" || key === "business_email") && !EMAIL_RE.test(v)) {
      return "ইমেইল ঠিকানাটি সঠিক নয় (যেমন info@aboenterprise.com)।";
    }
    if ((key === "contact_hours_en" || key === "contact_hours_bn") && !sanitizeBusinessHours(v, brand)) {
      return "‘ব্যবসার সময়’ ঘরে ব্যবসার নাম নয়, খোলার সময় লিখুন — যেমন: শনি–বৃহঃ, সকাল ৯টা–রাত ৯টা।";
    }
    if (key.startsWith("delivery_charge_") && !(Number.isFinite(Number(v)) && Number(v) >= 0)) {
      return "ডেলিভারি চার্জ শুধু সংখ্যা হবে (যেমন 60) — টাকার চিহ্ন বা অক্ষর দেবেন না।";
    }
  }
  return null;
}
