import { getSettingValue } from "@/lib/settingValue";

const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9ঀ-৿]+/g, "");

/**
 * Opening hours as entered in the admin panel, minus an obvious data-entry
 * slip: when the field just repeats the business name (e.g. "ABO ENTERPRISE")
 * it is not a schedule, so it is treated as "not set" instead of being shown
 * to customers as business hours.
 */
export function sanitizeBusinessHours(raw: string | undefined, brand = ""): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  const n = normalize(value);
  if (n === "aboenterprise" || (brand && n === normalize(brand))) return "";
  return value;
}

/** Business hours for the visitor's language, from the public settings. */
export function getBusinessHours(settings: Record<string, string>, lang: "bn" | "en"): string {
  const raw = getSettingValue(settings, lang === "bn" ? "contact_hours_bn" : "contact_hours_en");
  return sanitizeBusinessHours(raw, getSettingValue(settings, "site_name"));
}
